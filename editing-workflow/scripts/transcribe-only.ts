#!/usr/bin/env npx tsx
/**
 * transcribe-only — Interactive CLI
 *
 * Transcribes a video and saves Transcript-only.json next to the video file.
 * No content folders, no copying, no pipeline — just the transcript.
 *
 * Usage: npx tsx scripts/transcribe-only.ts <video_path>
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { extractAudio, ensureDir } from "../src/lib/ffmpeg";
import { transcribeAudio } from "../src/lib/elevenlabs";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnv(projectRoot);

  const rawArg = process.argv[2];
  if (!rawArg) {
    console.error("Usage: npx tsx scripts/transcribe-only.ts <video_path>");
    process.exit(1);
  }
  const videoPath = path.resolve(rawArg.replace(/\\ /g, " ").replace(/^['"]|['"]$/g, ""));

  if (!existsSync(videoPath)) {
    console.error(`\n  Error: file not found: ${videoPath}`);
    process.exit(1);
  }

  const videoDir = path.dirname(videoPath);
  const title = path.basename(videoPath, path.extname(videoPath));
  const tmpDir = path.join(videoDir, `.tmp-transcribe-${Date.now()}`);

  console.log();
  console.log(`  File   : ${path.basename(videoPath)}`);
  console.log(`  Output : ${path.join(videoDir, "Transcript-only.json")}`);
  console.log();

  await ensureDir(tmpDir);

  // Extract audio
  console.log("  Extracting audio...");
  const audioPath = path.join(tmpDir, "audio.mp3");
  await extractAudio(videoPath, audioPath);
  console.log("  ✓ Audio extracted");

  // Transcribe
  console.log("  Transcribing with ElevenLabs Scribe...");
  const transcript = await transcribeAudio(audioPath);
  const wordCount = transcript.words.filter((w) => w.type === "word").length;

  // Save transcript next to the video
  const outPath = path.join(videoDir, "Transcript-only.json");
  await fs.writeFile(outPath, JSON.stringify(transcript, null, 2), "utf8");

  // Clean up
  await fs.rm(tmpDir, { recursive: true, force: true });

  // Preview
  console.log();
  const preview = transcript.text.slice(0, 500);
  console.log(`  ${preview}${transcript.text.length > 500 ? "..." : ""}`);
  console.log();
  console.log(`  ✓ Done — ${wordCount} words`);
  console.log(`  ✓ Saved: ${outPath}`);
  console.log();
}

main().catch((err) => {
  console.error(`\n  Transcription failed: ${err.message ?? err}`);
  process.exit(1);
});
