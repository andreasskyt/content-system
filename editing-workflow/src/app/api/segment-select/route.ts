import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getJob, jobDir, setStage, updateJob } from "@/lib/jobStore";
import { selectSegments } from "@/lib/claude";
import { ElevenLabsTranscript } from "@/lib/types";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.stage !== "transcribed") {
    return NextResponse.json(
      { error: `Expected stage 'transcribed', got '${job.stage}'` },
      { status: 400 }
    );
  }

  await setStage(jobId, "segment_selecting");

  const dir = jobDir(jobId);
  const transcriptRaw = await fs.readFile(
    path.join(dir, job.transcriptPath!),
    "utf8"
  );
  const transcript: ElevenLabsTranscript = JSON.parse(transcriptRaw);

  try {
    const segments = await selectSegments(transcript);

    const segmentsFilename = "segments.json";
    await fs.writeFile(
      path.join(dir, segmentsFilename),
      JSON.stringify(segments, null, 2),
      "utf8"
    );

    await updateJob(jobId, {
      stage: "segments_selected",
      segmentsPath: segmentsFilename,
    });

    const totalSelected = segments.reduce((acc, s) => acc + (s.end - s.start), 0);

    return NextResponse.json({
      jobId,
      segments,
      segmentCount: segments.length,
      totalSelectedSec: Math.round(totalSelected * 10) / 10,
    });
  } catch (err) {
    await updateJob(jobId, { stage: "error", error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
