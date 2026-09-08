import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getJob, jobDir, setStage, updateJob } from "@/lib/jobStore";
import { concatClips } from "@/lib/ffmpeg";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.stage !== "clips_extracted") {
    return NextResponse.json(
      { error: `Expected stage 'clips_extracted', got '${job.stage}'` },
      { status: 400 }
    );
  }
  if (!job.rawClips || job.rawClips.length === 0) {
    return NextResponse.json({ error: "No raw clips found" }, { status: 400 });
  }

  await setStage(jobId, "concatenating");

  const dir = jobDir(jobId);

  const clipPaths = job.rawClips
    .sort((a, b) => a.segmentIndex - b.segmentIndex)
    .map((c) => path.join(dir, c.filename));

  const concatTxt = path.join(dir, ".tmp_clips", "concat.txt");
  const outputPath = path.join(dir, "edit.mp4");
  const outputRelative = "edit.mp4";

  try {
    await concatClips(clipPaths, concatTxt, outputPath);
    // Clean up temp clips
    await fs.rm(path.join(dir, ".tmp_clips"), { recursive: true, force: true });
  } catch (err) {
    await updateJob(jobId, { stage: "error", error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  await updateJob(jobId, {
    stage: "concatenated",
    outputVideoPath: outputRelative,
  });

  return NextResponse.json({ jobId, outputPath: outputRelative });
}
