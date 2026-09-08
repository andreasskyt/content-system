#!/usr/bin/env npx tsx
/**
 * sfx — lays a UI click track under the edit.
 *
 * The governing idea is that a click is an attention RESET, not decoration.
 * Fire one on every word for twenty seconds and the ear stops hearing them:
 * you pay the full cost in clutter and get none of the benefit. So the track
 * runs dense across the opening words — where it signals "this is edited" and
 * buys the first two seconds — then drops back to marking structure: the start
 * of each caption line, each cut, and a heavier hit under every depth header.
 *
 * The library is synthesised by scripts/sfx-generate.py, not licensed. A paid
 * ad carrying a CC-BY attribution or a non-commercial clause is a liability,
 * and a click is a 10ms transient that models cleanly.
 *
 * Usage:
 *   npx tsx scripts/sfx.ts <content_folder> [--style <name>] [--dry]
 */

import path from "path";
import fs from "fs/promises";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";

import { probe } from "../src/lib/ffmpeg";
import { loadStyle } from "../src/styles";
import type { FinalTranscript } from "../src/lib/types";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const FFMPEG_FULL = "/usr/local/opt/ffmpeg-full/bin/ffmpeg";
const FFMPEG_BIN = existsSync(FFMPEG_FULL) ? FFMPEG_FULL : "ffmpeg";
const SR = 48_000;

/** Stage outputs the click track can be laid over, newest first. */
const SOURCE_PRECEDENCE = ["subs.mp4", "depth.mp4", "b-roll.mp4", "zoom.mp4", "edit.mp4"];

interface Cue {
  t: number;
  file: string;
  gain: number;
}

function findSource(dir: string): string | null {
  for (const name of SOURCE_PRECEDENCE) {
    const p = path.join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/** Mono 16-bit PCM from a WAV, skipping to the data chunk properly. */
function readWavMono(file: string): Float32Array {
  const buf = readFileSync(file);
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "data") {
      const n = Math.floor(size / 2);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(off + 8 + i * 2) / 32768;
      return out;
    }
    off += 8 + size + (size % 2);
  }
  throw new Error(`no data chunk in ${file}`);
}

function writeWavMono(file: string, samples: Float32Array): void {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(file, buf);
}

/** Word timings remapped onto the edit timeline. */
function previewWords(t: FinalTranscript): { text: string; start: number }[] {
  const cum: number[] = [];
  let run = 0;
  for (const seg of t.segments) {
    cum.push(run);
    run += seg.end - seg.start;
  }
  return t.words
    .filter((w) => w.type === "word")
    .map((w) => ({
      text: w.text,
      start: w.start - t.segments[w.segmentIndex].start + cum[w.segmentIndex],
    }));
}

function cutTimes(t: FinalTranscript): number[] {
  const out: number[] = [];
  let run = 0;
  for (const seg of t.segments.slice(0, -1)) {
    run += seg.end - seg.start;
    out.push(run);
  }
  return out;
}

/** Header onsets, read back from the ASS depth.ts already wrote. */
function headerTimes(dir: string): number[] {
  const p = path.join(dir, "depth.ass");
  if (!existsSync(p)) return [];
  const seen = new Set<number>();
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^Dialogue:\s*\d+,(\d+):(\d\d):(\d\d\.\d\d),/.exec(line);
    if (!m) continue;
    const t = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    seen.add(Math.round(t * 100) / 100);
  }
  return [...seen].sort((a, b) => a - b);
}

async function main() {
  const argv = process.argv.slice(2);
  const consumed = new Set<number>();
  const flag = (n: string) => {
    const i = argv.indexOf(n);
    if (i === -1) return undefined;
    consumed.add(i).add(i + 1);
    return argv[i + 1];
  };
  const has = (n: string) => {
    const i = argv.indexOf(n);
    if (i !== -1) consumed.add(i);
    return i !== -1;
  };

  const styleName = flag("--style") ?? "landscape-creator-b";
  const dry = has("--dry");
  const folder = argv.find((_, i) => !consumed.has(i));
  if (!folder) {
    console.error("Usage: npx tsx scripts/sfx.ts <content_folder> [--style <name>] [--dry]");
    process.exit(1);
  }

  const dir = path.isAbsolute(folder) ? folder : path.resolve(folder);
  const style = loadStyle(styleName);
  const spec = style.sfx;
  const place = spec.placement;
  if (!spec.enabled || !place) {
    console.log(`Style "${styleName}" has no enabled sfx placement — nothing to do.`);
    return;
  }

  const source = findSource(dir);
  if (!source) {
    console.error(`Error: no source video in ${dir}`);
    process.exit(1);
  }
  const transcriptPath = path.join(dir, "final_transcript.json");
  if (!existsSync(transcriptPath)) {
    console.error(`Error: final_transcript.json not found in ${dir}`);
    process.exit(1);
  }

  const meta = await probe(source);
  const transcript: FinalTranscript = JSON.parse(await fs.readFile(transcriptPath, "utf8"));
  const words = previewWords(transcript);

  const libDir = path.join(PROJECT_ROOT, spec.library_path ?? "assets/sfx/clicks");
  const all = readdirSync(libDir).filter((f) => f.endsWith(".wav"));
  const clicks = all.filter((f) => f.startsWith("click_")).sort();
  const thuds = all.filter((f) => f.startsWith("thud_")).sort();
  if (clicks.length === 0) {
    console.error(`Error: no click_*.wav in ${libDir} — run scripts/sfx-generate.py`);
    process.exit(1);
  }

  // ── Cue list ────────────────────────────────────────────────────────────
  const cues: Cue[] = [];
  let rr = 0;
  const nextClick = () => clicks[rr++ % clicks.length];

  for (let i = 0; i < Math.min(place.opening_word_count, words.length); i++) {
    cues.push({ t: words[i].start, file: nextClick(), gain: place.opening_gain });
  }

  if (place.line_start_clicks) {
    // "Line start" without re-deriving the chunker: a word that follows a gap
    // long enough to be a new caption block.
    const openingEnd = words[Math.min(place.opening_word_count, words.length - 1)]?.start ?? 0;
    for (let i = 1; i < words.length; i++) {
      if (words[i].start <= openingEnd) continue;
      const gap = words[i].start - words[i - 1].start;
      if (gap >= style.subs.pause_threshold_sec) {
        cues.push({ t: words[i].start, file: nextClick(), gain: place.line_gain });
      }
    }
  }

  if (place.header_sound !== "off") {
    const pool = place.header_sound === "thud" && thuds.length ? thuds : clicks;
    headerTimes(dir).forEach((t, i) => {
      cues.push({ t, file: pool[i % pool.length], gain: place.header_gain });
    });
  }

  if (place.cut_ticks) {
    for (const t of cutTimes(transcript)) {
      cues.push({ t, file: clicks[clicks.length - 1], gain: place.cut_gain });
    }
  }

  cues.sort((a, b) => a.t - b.t);

  // Two cues inside 60ms read as one smeared click, so keep the louder.
  const merged: Cue[] = [];
  for (const c of cues) {
    const prev = merged.at(-1);
    if (prev && c.t - prev.t < 0.06) {
      if (c.gain > prev.gain) merged[merged.length - 1] = c;
      continue;
    }
    merged.push(c);
  }

  console.log(`  Source : ${path.basename(source)}`);
  console.log(`  Cues   : ${merged.length} (${place.opening_word_count} opening, then structure only)`);
  for (const c of merged.slice(0, 40)) {
    console.log(`    ${c.t.toFixed(2).padStart(6)}s  ${c.file}  x${c.gain}`);
  }
  if (merged.length > 40) console.log(`    … ${merged.length - 40} more`);
  if (dry) return;

  // ── Render the click track ──────────────────────────────────────────────
  const cache = new Map<string, Float32Array>();
  const track = new Float32Array(Math.ceil((meta.durationSec + 0.5) * SR));
  for (const c of merged) {
    let s = cache.get(c.file);
    if (!s) {
      s = readWavMono(path.join(libDir, c.file));
      cache.set(c.file, s);
    }
    const off = Math.round(c.t * SR);
    for (let i = 0; i < s.length && off + i < track.length; i++) {
      track[off + i] += s[i] * c.gain;
    }
  }
  // Sum-then-clamp would distort where cues overlap; scale instead.
  let peak = 0;
  for (const v of track) peak = Math.max(peak, Math.abs(v));
  if (peak > 0.98) for (let i = 0; i < track.length; i++) track[i] *= 0.98 / peak;

  const trackPath = path.join(dir, "sfx.wav");
  writeWavMono(trackPath, track);

  const outPath = path.join(dir, "sfx.mp4");
  const db = spec.volume_db ?? -18;
  const r = spawnSync(
    FFMPEG_BIN,
    [
      "-y", "-hide_banner", "-loglevel", "error",
      "-i", source,
      "-i", trackPath,
      "-filter_complex",
      `[1:a]volume=${db}dB[s];[0:a][s]amix=inputs=2:duration=first:normalize=0[a]`,
      "-map", "0:v", "-map", "[a]",
      "-c:v", "copy",
      "-c:a", "aac", "-b:a", "192k",
      outPath,
    ],
    { stdio: "pipe", encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.error(r.stderr?.split("\n").slice(-15).join("\n"));
    throw new Error(`ffmpeg exited ${r.status}`);
  }

  console.log(`\n  ✓ ${outPath}`);
}

main().catch((err) => {
  console.error(`\n  sfx failed: ${err.message ?? err}`);
  process.exit(1);
});
