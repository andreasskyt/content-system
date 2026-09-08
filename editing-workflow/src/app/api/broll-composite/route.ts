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

async function ffmpeg(args: string[]): Promise<void> {
  await execFileAsync("ffmpeg", args);
}

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.stage !== "broll_rendered") {
    return NextResponse.json(
      { error: `Expected stage 'broll_rendered', got '${job.stage}'` },
      { status: 409 }
    );
  }

  await setStage(jobId, "compositing_broll");

  try {
    const dir = jobDir(jobId);
    const cuesRaw = await fs.readFile(path.join(dir, "broll_cues.json"), "utf8");
    const cueSet: BRollCueSet = JSON.parse(cuesRaw);

    const editVideoPath = findEditVideo(dir);
    if (!editVideoPath) throw new Error("No edit video found");
    const { durationSec: editDurationSec } = await probe(editVideoPath);

    if (cueSet.cues.length === 0) {
      const rel = path.relative(dir, editVideoPath);
      await updateJob(jobId, { brollOutputPath: rel });
      await setStage(jobId, "broll_complete");
      return NextResponse.json({ jobId, outputPath: rel });
    }

    const rendersDir = path.join(dir, "broll_renders");
    const tmpDir = path.join(dir, "tmp_composite");
    await ensureDir(tmpDir);

    // Extract audio from edit video
    const audioPath = path.join(tmpDir, "audio.aac");
    await ffmpeg(["-y", "-i", editVideoPath, "-vn", "-c:a", "aac", "-b:a", "192k", audioPath]);

    // Sort cues by start time
    const sorted = [...cueSet.cues].sort((a, b) => a.previewStart - b.previewStart);

    // Build segment list: [speaker, broll, speaker, broll, ...]
    const segments: { type: "speaker" | "broll"; start: number; end: number; cueId?: string }[] = [];
    let cursor = 0;

    for (const cue of sorted) {
      if (cue.previewStart > cursor) {
        segments.push({ type: "speaker", start: cursor, end: cue.previewStart });
      }
      segments.push({
        type: "broll",
        start: cue.previewStart,
        end: cue.previewEnd,
        cueId: cue.id,
      });
      cursor = cue.previewEnd;
    }
    if (cursor < editDurationSec) {
      segments.push({ type: "speaker", start: cursor, end: editDurationSec });
    }

    // Cut/re-encode each segment
    const concatFiles: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const outFile = path.join(tmpDir, `part_${String(i).padStart(3, "0")}.mp4`);
      concatFiles.push(outFile);

      if (seg.type === "speaker") {
        await ffmpeg([
          "-y", "-i", editVideoPath,
          "-ss", String(seg.start), "-to", String(seg.end),
          "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an", "-r", "30",
          outFile,
        ]);
      } else {
        const renderPath = path.join(rendersDir, `${seg.cueId}.mp4`);
        await ffmpeg([
          "-y", "-i", renderPath,
          "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an", "-r", "30",
          outFile,
        ]);
      }
    }

    // Write concat list
    const concatTxt = path.join(tmpDir, "concat.txt");
    await fs.writeFile(
      concatTxt,
      concatFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"),
      "utf8"
    );

    // Concat video
    const videoOnly = path.join(tmpDir, "video_only.mp4");
    await ffmpeg(["-y", "-f", "concat", "-safe", "0", "-i", concatTxt, "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-r", "30", "-an", videoOnly]);

    // Mux video + audio
    const brollOutputRelative = "b-roll.mp4";
    const finalPath = path.join(dir, brollOutputRelative);
    await ffmpeg([
      "-y", "-i", videoOnly, "-i", audioPath,
      "-c:v", "copy", "-c:a", "copy", "-map", "0:v", "-map", "1:a", "-shortest",
      finalPath,
    ]);

    // Clean up tmp
    await fs.rm(tmpDir, { recursive: true, force: true });

    await updateJob(jobId, { brollOutputPath: brollOutputRelative });
    await setStage(jobId, "broll_complete");

    return NextResponse.json({ jobId, outputPath: brollOutputRelative });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateJob(jobId, { error: msg });
    await setStage(jobId, "error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
