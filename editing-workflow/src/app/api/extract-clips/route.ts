import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getJob, jobDir, setStage, updateJob } from "@/lib/jobStore";
import { cutClip, ensureDir } from "@/lib/ffmpeg";
import { FinalTranscript, RawClip } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.stage !== "final_transcript_ready") {
    return NextResponse.json(
      { error: `Expected stage 'final_transcript_ready', got '${job.stage}'` },
      { status: 400 }
    );
  }

  await setStage(jobId, "extracting_clips");

  const dir = jobDir(jobId);
  const clipsDir = path.join(dir, ".tmp_clips");
  await ensureDir(clipsDir);

  const transcriptRaw = await fs.readFile(
    path.join(dir, job.finalTranscriptPath!),
    "utf8"
  );
  const finalTranscript: FinalTranscript = JSON.parse(transcriptRaw);
  const { segments } = finalTranscript;

  const inputPath = path.join(dir, job.originalVideoPath!);
  const rawClips: RawClip[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const filename = `segment_${String(i).padStart(3, "0")}.mp4`;
    const outputPath = path.join(clipsDir, filename);

    try {
      const PRE_ROLL_SEC = 0.15;
      await cutClip(inputPath, outputPath, Math.max(0, seg.start - PRE_ROLL_SEC), seg.end);
    } catch (err) {
      await updateJob(jobId, {
        stage: "error",
        error: `Failed cutting segment ${i}: ${String(err)}`,
      });
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }

    rawClips.push({
      segmentIndex: i,
      filename: path.join(".tmp_clips", filename),
      start: seg.start,
      end: seg.end,
      durationSec: Math.round((seg.end - seg.start) * 100) / 100,
    });

    await updateJob(jobId, {
      stageProgress: Math.round(((i + 1) / segments.length) * 100),
    });
  }

  await updateJob(jobId, { stage: "clips_extracted", rawClips });
  return NextResponse.json({ jobId, clips: rawClips });
}
