import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync, readdirSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

import { getJob, setStage, updateJob, jobDir } from "@/lib/jobStore";
import { probe } from "@/lib/ffmpeg";
import { ensureDir } from "@/lib/ffmpeg";
import type { BRollCueSet } from "@/lib/types";

function findEditVideo(dir: string): string | null {
  const flat = path.join(dir, "edit.mp4");
  if (existsSync(flat)) return flat;
  const editDir = path.join(dir, "edit");
  if (existsSync(editDir)) {
    const files = readdirSync(editDir).filter(f => f.endsWith(".mp4"));
    if (files.length > 0) return path.join(editDir, files[0]);
  }
  const legacy = path.join(dir, "output", "preview.mp4");
  if (existsSync(legacy)) return legacy;
  return null;
}

const execFileAsync = promisify(execFile);

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.stage !== "broll_cues_ready") {
    return NextResponse.json(
      { error: `Expected stage 'broll_cues_ready', got '${job.stage}'` },
      { status: 409 }
    );
  }

  await setStage(jobId, "rendering_broll");

  try {
    const dir = jobDir(jobId);
    const cuesRaw = await fs.readFile(path.join(dir, "broll_cues.json"), "utf8");
    const cueSet: BRollCueSet = JSON.parse(cuesRaw);

    if (cueSet.cues.length === 0) {
      await setStage(jobId, "broll_rendered");
      return NextResponse.json({ jobId, rendered: 0 });
    }

    const editVideoPath = findEditVideo(dir);
    if (!editVideoPath) throw new Error("No edit video found");
    const previewMeta = await probe(editVideoPath);

    const rendersDir = path.join(dir, "broll_renders");
    await ensureDir(rendersDir);

    const projectRoot = path.resolve(process.cwd());
    const remotionEntry = path.join(projectRoot, "src/remotion/index.ts");
    const inspirationDir = path.join(projectRoot, "assets", "broll-inspiration");

    for (const cue of cueSet.cues) {
      const outputPath = path.join(rendersDir, `${cue.id}.mp4`);
      const durationFrames = Math.round(cue.durationSec * 30);

      const spec = { ...cue.animationSpec } as Record<string, unknown>;
      const publicBrollDir = path.join(projectRoot, "public", "broll-inspiration");
      if (cue.animationSpec.template === "illustration" && cue.animationSpec.imageKey) {
        const imgPath = path.join(inspirationDir, cue.animationSpec.imageKey);
        if (existsSync(imgPath)) {
          await ensureDir(publicBrollDir);
          const dest = path.join(publicBrollDir, cue.animationSpec.imageKey);
          if (!existsSync(dest)) await fs.copyFile(imgPath, dest);
          spec.imageSrc = `broll-inspiration/${cue.animationSpec.imageKey}`;
        }
      }
      if (cue.animationSpec.template === "showcase" && cue.animationSpec.imageKeys) {
        await ensureDir(publicBrollDir);
        const srcs: string[] = [];
        for (const k of cue.animationSpec.imageKeys) {
          const imgPath = path.join(inspirationDir, k);
          if (existsSync(imgPath)) {
            const dest = path.join(publicBrollDir, k);
            if (!existsSync(dest)) await fs.copyFile(imgPath, dest);
            srcs.push(`broll-inspiration/${k}`);
          }
        }
        spec.imageSrcs = srcs;
      }

      const props = {
        spec,
        durationFrames,
        widthOverride: previewMeta.width,
        heightOverride: previewMeta.height,
      };

      const propsFile = path.join(rendersDir, `${cue.id}_props.json`);
      await fs.writeFile(propsFile, JSON.stringify(props), "utf8");

      await execFileAsync(
        "npx",
        ["remotion", "render", remotionEntry, "BRollScene", outputPath, `--props=${propsFile}`],
        { cwd: projectRoot }
      );

      await fs.unlink(propsFile).catch(() => {});
    }

    await setStage(jobId, "broll_rendered");
    return NextResponse.json({ jobId, rendered: cueSet.cues.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateJob(jobId, { error: msg });
    await setStage(jobId, "error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
