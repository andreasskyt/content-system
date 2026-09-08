#!/usr/bin/env npx tsx
/**
 * BRAND Editing Pipeline — CLI
 *
 * Usage:
 *   npx tsx scripts/pipeline.ts <video_path> [--title "Title"] [--instructions "..."]
 *
 * Runs the full pipeline for a single video:
 *   probe → detect format → create content folder → move raw →
 *   extract audio → transcribe → AI segment selection →
 *   final transcript → cut clips → concat preview
 *
 * Output lands in Content/{Reels|YouTube}/{title}/
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { execSync } from "child_process";

import {
  probe,
  extractAudio,
  cutClip,
  concatClips,
  ensureDir,
} from "../src/lib/ffmpeg";
import { transcribeAudio } from "../src/lib/elevenlabs";
import { reviewTranscript } from "../src/lib/transcript-review";
import { selectSegments } from "../src/lib/claude";
import type {
  ElevenLabsTranscript,
  FinalTranscript,
  RawClip,
  TimeRange,
} from "../src/lib/types";

import {
  CLIP_PRE_ROLL_SEC as PRE_ROLL_SEC,
  CLIP_TAIL_SEC as TAIL_SEC,
  SHORT_FORM_DIR,
  LONG_FORM_DIR,
} from "../src/lib/constants";

// ── Config ────────────────────────────────────────────────────────────────────
// PRE_ROLL_SEC is shared with src/lib/subtitles.ts so the subtitle remapper
// stays in sync — see src/lib/constants.ts.

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function loadEnv(projectRoot: string) {
  const envPath = path.join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = require("fs").readFileSync(envPath, "utf8") as string;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

function parseArgs(argv: string[]): {
  videoPath: string;
  title?: string;
  instructions?: string;
} {
  let videoPath = "";
  let title: string | undefined;
  let instructions: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--title" && argv[i + 1]) {
      title = argv[++i];
    } else if (argv[i] === "--instructions" && argv[i + 1]) {
      instructions = argv[++i];
    } else if (!videoPath) {
      videoPath = argv[i];
    }
  }
  return { videoPath, title, instructions };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnv(projectRoot);

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: npx tsx scripts/pipeline.ts <video_path> [--title "Title"] [--instructions "..."]'
    );
    process.exit(1);
  }

  const parsed = parseArgs(args);
  const videoPath = path.resolve(parsed.videoPath);

  if (!existsSync(videoPath)) {
    console.error(`Error: file not found: ${videoPath}`);
    process.exit(1);
  }

  // 1. Probe to detect format before anything else
  const meta = await probe(videoPath);
  const isPortrait = meta.height > meta.width;
  const isShortForm =
    isPortrait || meta.durationSec < 180 || (meta.durationSec < 300 && isPortrait);
  const format = isShortForm ? SHORT_FORM_DIR : LONG_FORM_DIR;

  // Derive title from filename if not specified
  const title =
    parsed.title ?? path.basename(videoPath, path.extname(videoPath));

  // Content folder
  const contentBase =
    process.env.CONTENT_BASE ??
    "[CONTENT_ROOT]";

  // Check if the video is already inside a content folder (reuse it instead of creating a new one)
  const videoDir = path.dirname(videoPath);
  const isInsideContentFolder =
    videoDir.startsWith(path.join(contentBase, SHORT_FORM_DIR)) ||
    videoDir.startsWith(path.join(contentBase, LONG_FORM_DIR));
  const dir = isInsideContentFolder ? videoDir : path.join(contentBase, format, title);

  const log = (msg: string) => console.log(`[${title}] ${msg}`);

  log(`Starting pipeline`);
  log(`Video  : ${videoPath}`);
  log(`Format : ${format} (${meta.width}x${meta.height})`);
  log(`Output : ${dir}`);
  if (parsed.instructions) {
    log(`Custom : ${parsed.instructions.slice(0, 80)}${parsed.instructions.length > 80 ? "…" : ""}`);
  }
  console.log();

  // Create dir
  await ensureDir(dir);

  // Set Finder view: icon view + group by kind
  try {
    execSync(`"${path.join(projectRoot, "scripts", "set-folder-view.sh")}" "${dir}"`, { stdio: "pipe" });
  } catch {}


  // 2. Copy raw video into content folder (preserve the original in its source folder so it can be re-run)
  const rawDest = path.join(dir, "raw.mp4");
  if (!existsSync(rawDest)) {
    await fs.copyFile(videoPath, rawDest);
    log(`✓ Copied raw video → raw.mp4`);
  } else {
    log(`✓ raw.mp4 already exists (re-run)`);
  }

  log(
    `✓ Probed: ${fmtDuration(meta.durationSec)} · ${meta.width}×${meta.height}`
  );

  // 3-4. Transcribe (skip if cached transcript.json already exists in folder)
  const transcriptPath = path.join(dir, "transcript.json");
  let transcript: ElevenLabsTranscript;
  if (existsSync(transcriptPath)) {
    transcript = JSON.parse(await fs.readFile(transcriptPath, "utf8"));
    const wordCount = transcript.words.filter((w) => w.type === "word").length;
    log(`✓ Reusing cached transcript.json (${wordCount} words)`);
    if (!transcript.reviewed) {
      transcript = await reviewTranscript(transcript, log);
      await fs.writeFile(transcriptPath, JSON.stringify(transcript, null, 2), "utf8");
    }
  } else {
    log(`  Extracting audio...`);
    const audioPath = path.join(dir, "audio.mp3");
    await extractAudio(rawDest, audioPath);
    log(`✓ Audio extracted (16kHz mono mp3)`);

    log(`  Transcribing with ElevenLabs Scribe...`);
    transcript = await transcribeAudio(audioPath);
    await fs.unlink(audioPath).catch(() => {});
    const wordCount = transcript.words.filter((w) => w.type === "word").length;
    await fs.writeFile(
      transcriptPath,
      JSON.stringify(transcript, null, 2),
      "utf8"
    );
    log(
      `✓ Transcribed: ${wordCount} words · ${transcript.language_code ?? "unknown"}`
    );
  }
  const wordCount = transcript.words.filter((w) => w.type === "word").length;

  // 5. AI segment selection (with optional custom instructions)
  log(`  Running Claude segment selection...`);
  const segments: TimeRange[] = await selectSegments(
    transcript,
    parsed.instructions
  );
  await fs.writeFile(
    path.join(dir, "segments.json"),
    JSON.stringify(segments, null, 2),
    "utf8"
  );
  const totalSelected = segments.reduce(
    (acc, s) => acc + (s.end - s.start),
    0
  );
  const reductionPct = Math.round(
    (1 - totalSelected / meta.durationSec) * 100
  );
  log(
    `✓ Selected ${segments.length} segments · ${fmtDuration(totalSelected)} · ${reductionPct}% cut`
  );

  // 6. Build final transcript
  const finalWords = transcript.words
    .filter((word) =>
      segments.some((seg) => word.start >= seg.start && word.end <= seg.end)
    )
    .map((word) => ({
      text: word.text,
      start: word.start,
      end: word.end,
      type: word.type,
      segmentIndex: segments.findIndex(
        (seg) => word.start >= seg.start && word.end <= seg.end
      ),
      speaker_id: word.speaker_id,
    }));

  const finalTranscript: FinalTranscript = {
    words: finalWords,
    segments,
    totalDurationSec: Math.round(totalSelected * 100) / 100,
  };
  await fs.writeFile(
    path.join(dir, "final_transcript.json"),
    JSON.stringify(finalTranscript, null, 2),
    "utf8"
  );

  // Print segment text preview
  console.log();
  log(`── Transcript Preview ──────────────────────────`);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const text = finalWords
      .filter((w) => w.segmentIndex === i && w.type === "word")
      .map((w) => w.text)
      .join(" ");
    log(
      `  #${i + 1} [${fmtDuration(seg.start)}→${fmtDuration(seg.end)}] ${text.slice(0, 100)}${text.length > 100 ? "…" : ""}`
    );
  }
  console.log();

  // 7. Cut clips to temp dir, concat, then clean up
  log(`  Cutting ${segments.length} clips...`);
  const tmpClipsDir = path.join(dir, ".tmp_clips");
  await ensureDir(tmpClipsDir);

  const rawClips: RawClip[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const filename = `segment_${String(i).padStart(3, "0")}.mp4`;
    const clipPath = path.join(tmpClipsDir, filename);
    await cutClip(
      rawDest,
      clipPath,
      Math.max(0, seg.start - PRE_ROLL_SEC),
      Math.min(meta.durationSec, seg.end + TAIL_SEC)
    );
    rawClips.push({
      segmentIndex: i,
      filename,
      start: seg.start,
      end: seg.end,
      durationSec: Math.round((seg.end - seg.start) * 100) / 100,
    });
    log(
      `  ✓ Clip ${i + 1}/${segments.length} (${fmtDuration(seg.end - seg.start)})`
    );
  }

  // 8. Concat into edit video
  log(`  Concatenating edit...`);
  const clipPaths = rawClips.map((c) => path.join(tmpClipsDir, c.filename));
  const concatTxt = path.join(tmpClipsDir, "concat.txt");
  const editPath = path.join(dir, "edit.mp4");
  await concatClips(clipPaths, concatTxt, editPath);

  // Clean up temp clips
  await fs.rm(tmpClipsDir, { recursive: true, force: true });

  // 9. Write summary
  const summary = {
    title,
    format,
    contentFolder: dir,
    durationSec: meta.durationSec,
    selectedDurationSec: totalSelected,
    reductionPct,
    segmentCount: segments.length,
    wordCount,
    editVideo: editPath,
    completedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(dir, "job.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  // 10. Done
  console.log();
  log(`✓ ─────────────────────────────────────────────`);
  log(`✓ DONE`);
  log(`  Edit    : ${editPath}`);
  log(`  Folder  : ${dir}`);
  log(
    `  Duration: ${fmtDuration(totalSelected)} from ${fmtDuration(meta.durationSec)} (${reductionPct}% cut)`
  );
  log(`  Next    : review the edit, then run /b-roll "${dir}"`);
  log(`✓ ─────────────────────────────────────────────`);

  console.log("\n__RESULT__");
  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(`\nPipeline failed: ${err.message ?? err}`);
  process.exit(1);
});
