import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getJob, jobDir, setStage, updateJob } from "@/lib/jobStore";
import { transcribeAudio } from "@/lib/elevenlabs";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.stage !== "audio_extracted") {
    return NextResponse.json(
      { error: `Expected stage 'audio_extracted', got '${job.stage}'` },
      { status: 400 }
    );
  }

  await setStage(jobId, "transcribing");

  const dir = jobDir(jobId);
  const audioPath = path.join(dir, job.audioPath!);
  const transcriptFilename = "transcript.json";
  const transcriptPath = path.join(dir, transcriptFilename);

  try {
    const transcript = await transcribeAudio(audioPath);
    await fs.unlink(audioPath).catch(() => {});
    // Write verbatim — this file is IMMUTABLE after this point
    await fs.writeFile(transcriptPath, JSON.stringify(transcript, null, 2), "utf8");

    await updateJob(jobId, {
      stage: "transcribed",
      transcriptPath: transcriptFilename,
    });

    return NextResponse.json({
      jobId,
      wordCount: transcript.words.filter((w) => w.type === "word").length,
      languageCode: transcript.language_code,
      previewText: transcript.text.slice(0, 300),
    });
  } catch (err) {
    await updateJob(jobId, { stage: "error", error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
