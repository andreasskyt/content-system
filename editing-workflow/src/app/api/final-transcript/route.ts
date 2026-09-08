import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getJob, jobDir, setStage, updateJob } from "@/lib/jobStore";
import {
  ElevenLabsTranscript,
  FinalTranscript,
  TimeRange,
} from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jobId, segments: userSegments } = body;

  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.stage !== "segments_selected") {
    return NextResponse.json(
      { error: `Expected stage 'segments_selected', got '${job.stage}'` },
      { status: 400 }
    );
  }

  await setStage(jobId, "building_final_transcript");

  const dir = jobDir(jobId);

  // Use user-provided segments (after review) or fall back to AI-selected
  let segments: TimeRange[];
  if (userSegments && Array.isArray(userSegments)) {
    segments = userSegments;
  } else {
    const raw = await fs.readFile(path.join(dir, job.segmentsPath!), "utf8");
    segments = JSON.parse(raw);
  }

  const transcriptRaw = await fs.readFile(
    path.join(dir, job.transcriptPath!),
    "utf8"
  );
  const transcript: ElevenLabsTranscript = JSON.parse(transcriptRaw);

  // Map words to segments — text is NEVER modified
  const finalWords = transcript.words
    .filter((word) => {
      return segments.some(
        (seg) => word.start >= seg.start && word.end <= seg.end
      );
    })
    .map((word) => {
      const segmentIndex = segments.findIndex(
        (seg) => word.start >= seg.start && word.end <= seg.end
      );
      return {
        text: word.text,
        start: word.start,
        end: word.end,
        type: word.type,
        segmentIndex,
        speaker_id: word.speaker_id,
      };
    });

  const totalDurationSec = segments.reduce(
    (acc, s) => acc + (s.end - s.start),
    0
  );

  const finalTranscript: FinalTranscript = {
    words: finalWords,
    segments,
    totalDurationSec: Math.round(totalDurationSec * 100) / 100,
  };

  const filename = "final_transcript.json";
  await fs.writeFile(
    path.join(dir, filename),
    JSON.stringify(finalTranscript, null, 2),
    "utf8"
  );

  await updateJob(jobId, {
    stage: "final_transcript_ready",
    finalTranscriptPath: filename,
    segmentsPath: job.segmentsPath, // keep original, segments.json still references AI output
  });

  // Pre-group text by segment for the preview UI
  const segmentTexts = segments.map((_, idx) =>
    finalWords
      .filter((w) => w.segmentIndex === idx && w.type === "word")
      .map((w) => w.text)
      .join(" ")
  );

  return NextResponse.json({
    jobId,
    wordCount: finalWords.filter((w) => w.type === "word").length,
    segmentCount: segments.length,
    totalDurationSec: finalTranscript.totalDurationSec,
    segmentTexts,
    segments,
  });
}
