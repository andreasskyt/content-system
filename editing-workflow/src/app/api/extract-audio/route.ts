import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getJob, jobDir, setStage, updateJob } from "@/lib/jobStore";
import { extractAudio } from "@/lib/ffmpeg";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.stage !== "uploaded") {
    return NextResponse.json({ error: `Expected stage 'uploaded', got '${job.stage}'` }, { status: 400 });
  }

  await setStage(jobId, "extracting_audio");

  const dir = jobDir(jobId);
  const inputPath = path.join(dir, job.originalVideoPath!);
  const audioFilename = "audio.mp3";
  const outputPath = path.join(dir, audioFilename);

  try {
    await extractAudio(inputPath, outputPath);
  } catch (err) {
    await updateJob(jobId, { stage: "error", error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  await updateJob(jobId, { stage: "audio_extracted", audioPath: audioFilename });
  return NextResponse.json({ jobId, audioPath: audioFilename });
}
