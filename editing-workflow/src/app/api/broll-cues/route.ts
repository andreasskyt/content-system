import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync, readdirSync } from "fs";

import { getJob, setStage, updateJob, jobDir } from "@/lib/jobStore";
import { generateBRollCues } from "@/lib/claude";
import { probe } from "@/lib/ffmpeg";
import type { FinalTranscript, BRollCueSet } from "@/lib/types";

function findEditVideoSync(dir: string): string | null {
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

async function findEditVideo(dir: string): Promise<string | null> {
  return findEditVideoSync(dir);
}

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const allowedStages = [
    "concatenated",
    "broll_cues_ready",
    "broll_rendered",
  ];
  if (!allowedStages.includes(job.stage)) {
    return NextResponse.json(
      { error: `Job is in stage "${job.stage}" — must be concatenated first` },
      { status: 409 }
    );
  }

  await setStage(jobId, "generating_broll_cues");

  try {
    const dir = jobDir(jobId);

    if (!job.finalTranscriptPath) {
      throw new Error("Final transcript path not found in job");
    }
    const transcriptRaw = await fs.readFile(
      path.join(dir, job.finalTranscriptPath),
      "utf8"
    );
    const finalTranscript: FinalTranscript = JSON.parse(transcriptRaw);

    // Find edit video
    const editVideoPath = await findEditVideo(dir);
    if (!editVideoPath) {
      throw new Error("No edit video found — run concat first");
    }
    const { durationSec: previewDurationSec } = await probe(editVideoPath);

    // Load manifest for illustration template
    const manifestPath = path.join(process.cwd(), "assets", "broll-inspiration", "manifest.md");
    let manifestText: string | undefined;
    if (existsSync(manifestPath)) {
      manifestText = await fs.readFile(manifestPath, "utf8");
    }

    const cues = await generateBRollCues(
      finalTranscript,
      previewDurationSec,
      undefined,
      manifestText
    );

    const cueSet: BRollCueSet = {
      cues,
      previewDurationSec,
      generatedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(dir, "broll_cues.json"),
      JSON.stringify(cueSet, null, 2),
      "utf8"
    );

    await updateJob(jobId, { brollCuesPath: "broll_cues.json" });
    await setStage(jobId, "broll_cues_ready");

    return NextResponse.json({ jobId, cueCount: cues.length, cues });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateJob(jobId, { error: msg });
    await setStage(jobId, "error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
