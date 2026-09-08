#!/usr/bin/env npx tsx
/**
 * Prepares a manually edited video for the /b-roll pipeline.
 * Extracts audio, transcribes, and builds final_transcript.json.
 */
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { probe, extractAudio } from "../src/lib/ffmpeg";
import { transcribeAudio } from "../src/lib/elevenlabs";

function loadEnv(projectRoot: string) {
  const envPath = path.join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = require("fs").readFileSync(envPath, "utf8") as string;
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnv(projectRoot);

  const dir = process.argv[2];
  if (!dir) { console.error("Usage: npx tsx scripts/prep-for-broll.ts <content_folder>"); process.exit(1); }

  // Find edit video: flat → subfolder → legacy
  let videoPath = path.join(dir, "edit.mp4");
  if (!existsSync(videoPath)) {
    const editDir = path.join(dir, "edit");
    if (existsSync(editDir)) {
      const editFiles = require("fs").readdirSync(editDir).filter((f: string) => f.endsWith(".mp4"));
      if (editFiles.length > 0) videoPath = path.join(editDir, editFiles[0]);
    }
  }
  if (!existsSync(videoPath)) {
    const legacy = path.join(dir, "output/preview.mp4");
    if (existsSync(legacy)) videoPath = legacy;
  }
  if (!existsSync(videoPath)) { console.error(`No edit video found in ${dir}`); process.exit(1); }

  console.log("Probing video...");
  const meta = await probe(videoPath);
  console.log(`  ${meta.width}x${meta.height}, ${meta.durationSec.toFixed(1)}s`);

  console.log("Extracting audio...");
  const audioPath = path.join(dir, "audio.mp3");
  await extractAudio(videoPath, audioPath);
  console.log("  done");

  console.log("Transcribing with ElevenLabs...");
  const transcript = await transcribeAudio(audioPath);
  const wordCount = transcript.words.filter((w) => w.type === "word").length;
  console.log(`  ${wordCount} words`);

  await fs.writeFile(path.join(dir, "transcript.json"), JSON.stringify(transcript, null, 2));
  await fs.unlink(audioPath).catch(() => {});

  // Single segment covering the full video (already edited, no cuts needed)
  const segments = [{ start: 0, end: meta.durationSec }];
  const finalWords = transcript.words.map((w) => ({
    text: w.text,
    start: w.start,
    end: w.end,
    type: w.type,
    segmentIndex: 0,
    speaker_id: w.speaker_id,
  }));

  const finalTranscript = {
    words: finalWords,
    segments,
    totalDurationSec: meta.durationSec,
  };
  await fs.writeFile(path.join(dir, "final_transcript.json"), JSON.stringify(finalTranscript, null, 2));
  console.log("Ready for /b-roll");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
