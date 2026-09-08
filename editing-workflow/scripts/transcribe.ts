#!/usr/bin/env npx tsx
/**
 * BRAND Transcribe — CLI
 *
 * Usage:
 *   npx tsx scripts/transcribe.ts <video_path> [--title "Title"]
 *
 * Runs only the transcription portion of the editing pipeline:
 *   probe → create content folder → extract audio → transcribe
 *
 * Output lands in Content/{Reels|YouTube}/{title}/
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

import { probe, extractAudio, ensureDir } from "../src/lib/ffmpeg";
import { transcribeAudio } from "../src/lib/elevenlabs";
import type { ElevenLabsTranscript } from "../src/lib/types";
import { SHORT_FORM_DIR, LONG_FORM_DIR } from "../src/lib/constants";

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
} {
  let videoPath = "";
  let title: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--title" && argv[i + 1]) {
      title = argv[++i];
    } else if (!videoPath) {
      videoPath = argv[i];
    }
  }
  return { videoPath, title };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnv(projectRoot);

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: npx tsx scripts/transcribe.ts <video_path> [--title "Title"]'
    );
    process.exit(1);
  }

  const parsed = parseArgs(args);
  const videoPath = path.resolve(parsed.videoPath);

  if (!existsSync(videoPath)) {
    console.error(`Error: file not found: ${videoPath}`);
    process.exit(1);
  }

  // 1. Probe
  const meta = await probe(videoPath);
  const isShortForm = meta.height > meta.width;
  const format = isShortForm ? SHORT_FORM_DIR : LONG_FORM_DIR;

  const title =
    parsed.title ?? path.basename(videoPath, path.extname(videoPath));

  const contentBase =
    process.env.CONTENT_BASE ??
    "[CONTENT_ROOT]";
  const dir = path.join(contentBase, format, title);

  const log = (msg: string) => console.log(`[${title}] ${msg}`);

  log(`Starting transcription`);
  log(`Video  : ${videoPath}`);
  log(`Format : ${format} (${meta.width}x${meta.height})`);
  log(`Output : ${dir}`);
  console.log();

  await ensureDir(dir);

  // 2. Copy raw video (copy, not move — transcribe-only shouldn't relocate the original)
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

  // 3. Extract audio (temporary — deleted after transcription)
  log(`  Extracting audio...`);
  const audioPath = path.join(dir, "audio.mp3");
  await extractAudio(rawDest, audioPath);
  log(`✓ Audio extracted (16kHz mono mp3)`);

  // 4. Transcribe
  log(`  Transcribing with ElevenLabs Scribe...`);
  const transcript: ElevenLabsTranscript = await transcribeAudio(audioPath);
  await fs.unlink(audioPath).catch(() => {});
  const wordCount = transcript.words.filter((w) => w.type === "word").length;
  await fs.writeFile(
    path.join(dir, "transcript.json"),
    JSON.stringify(transcript, null, 2),
    "utf8"
  );
  log(
    `✓ Transcribed: ${wordCount} words · ${transcript.language_code ?? "unknown"}`
  );

  // Print transcript preview
  console.log();
  log(`── Transcript Preview ──────────────────────────`);
  const fullText = transcript.text;
  const previewLen = 500;
  log(`  ${fullText.slice(0, previewLen)}${fullText.length > previewLen ? "…" : ""}`);
  console.log();

  // 5. Write summary
  const summary = {
    title,
    format,
    contentFolder: dir,
    durationSec: meta.durationSec,
    wordCount,
    transcriptPath: path.join(dir, "transcript.json"),
    completedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(dir, "job.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  // 6. Done
  console.log();
  log(`✓ ─────────────────────────────────────────────`);
  log(`✓ DONE — Transcription only`);
  log(`  Transcript : ${path.join(dir, "transcript.json")}`);
  log(`  Folder     : ${dir}`);
  log(`  Duration   : ${fmtDuration(meta.durationSec)}`);
  log(`  Words      : ${wordCount}`);
  log(`  Next       : run /editing on this video to cut & build a preview`);
  log(`✓ ─────────────────────────────────────────────`);

  console.log("\n__RESULT__");
  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(`\nTranscription failed: ${err.message ?? err}`);
  process.exit(1);
});
