#!/usr/bin/env npx tsx
/**
 * add-music — Mix an MP3 music bed under a finished video's audio
 *
 * Takes any standalone video file + an MP3 song, produces a new video with
 * the song mixed in underneath the original audio track. Output is written
 * next to the input as {basename}-music.mp4.
 *
 * Usage:
 *   npx tsx scripts/add-music.ts <video_path> <music_path> [--volume 0.10]
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { execSync } from "child_process";

import { probe } from "../src/lib/ffmpeg";

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

function cleanPathArg(raw: string): string {
  return path.resolve(raw.replace(/\\ /g, " ").replace(/^['"]|['"]$/g, ""));
}

function parseArgs(argv: string[]): {
  video: string;
  music: string;
  volume: number;
} {
  let video = "";
  let music = "";
  let volume = 0.1;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--volume" && argv[i + 1]) {
      const v = parseFloat(argv[++i]);
      if (Number.isNaN(v) || v < 0) {
        console.error(`  Error: --volume must be a non-negative number`);
        process.exit(1);
      }
      volume = v;
    } else if (!video) {
      video = argv[i];
    } else if (!music) {
      music = argv[i];
    }
  }

  return { video, music, volume };
}

function ffmpeg(args: string) {
  execSync(`ffmpeg ${args}`, { stdio: "pipe" });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnv(projectRoot);

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      "Usage: npx tsx scripts/add-music.ts <video_path> <music_path> [--volume 0.10]"
    );
    process.exit(1);
  }

  const parsed = parseArgs(args);
  if (!parsed.video || !parsed.music) {
    console.error(
      "Usage: npx tsx scripts/add-music.ts <video_path> <music_path> [--volume 0.10]"
    );
    process.exit(1);
  }

  const videoPath = cleanPathArg(parsed.video);
  const musicPath = cleanPathArg(parsed.music);
  const { volume } = parsed;

  if (!existsSync(videoPath)) {
    console.error(`\n  Error: video not found: ${videoPath}`);
    process.exit(1);
  }
  if (!existsSync(musicPath)) {
    console.error(`\n  Error: music not found: ${musicPath}`);
    process.exit(1);
  }

  const videoDir = path.dirname(videoPath);
  const title = path.basename(videoPath, path.extname(videoPath));
  const outPath = path.join(videoDir, `${title}-music.mp4`);

  const meta = await probe(videoPath);

  console.log();
  console.log(`  Video  : ${path.basename(videoPath)}  (${fmtDuration(meta.durationSec)})`);
  console.log(`  Music  : ${path.basename(musicPath)}`);
  console.log(`  Volume : ${volume}`);
  console.log(`  Output : ${path.basename(outPath)}`);
  console.log();

  console.log("  Mixing...");
  // normalize=0 is essential: amix's default divides every input by the input
  // count, which drops the voice 6dB and lands the bed at half the requested
  // volume. With it off, the dialogue keeps its original level and `volume`
  // means what it says.
  const filter =
    `[1:a]volume=${volume}[music];` +
    `[0:a][music]amix=inputs=2:duration=first:dropout_transition=3:normalize=0[aout]`;

  ffmpeg(
    [
      `-y`,
      `-i "${videoPath}"`,
      `-i "${musicPath}"`,
      `-filter_complex "${filter}"`,
      `-map 0:v -map "[aout]"`,
      `-c:v copy`,
      `-c:a aac -b:a 192k`,
      `-shortest`,
      `"${outPath}"`,
    ].join(" ")
  );

  console.log();
  console.log(`  ✓ ─────────────────────────────────────────────`);
  console.log(`  ✓ Done — ${fmtDuration(meta.durationSec)}`);
  console.log(`  ✓ Saved: ${outPath}`);
  console.log();

  console.log("__RESULT__");
  console.log(
    JSON.stringify({
      output: outPath,
      durationSec: meta.durationSec,
      volume,
    })
  );
}

main().catch((err) => {
  console.error(`\n  add-music failed: ${err.message ?? err}`);
  process.exit(1);
});
