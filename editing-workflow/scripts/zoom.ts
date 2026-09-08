#!/usr/bin/env npx tsx
/**
 * zoom — slow push-ins on the moments that carry the point.
 *
 * Claude reads the edit's transcript and picks the beats worth emphasising;
 * each one gets a gentle scale ramp with a smoothstep envelope, so the move
 * starts and ends at zero velocity. There is no snap and no hold-then-release
 * pop — the whole point is that the viewer registers the emphasis without
 * noticing the mechanism.
 *
 * Also does quiet work on jump cuts: on a locked-off shot, cutting between
 * segments makes the speaker's head snap position. Giving neighbouring
 * segments different scales gives the eye a reason for the change.
 *
 * Runs BEFORE matte.ts — the mask has to be computed on the zoomed footage or
 * the silhouette won't line up with the frame it's masking.
 *
 * Usage:
 *   npx tsx scripts/zoom.ts <content_folder> [--amount 0.08] [--prescale 4]
 *                           [--regions "1.2-4.0|8.5-11.0"]
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { spawnSync } from "child_process";

import { probe } from "../src/lib/ffmpeg";
import { askClaude } from "../src/lib/claude-cli";
import { loadStyle } from "../src/styles";
import type { FinalTranscript } from "../src/lib/types";

const FFMPEG_FULL = "/usr/local/opt/ffmpeg-full/bin/ffmpeg";
const FFMPEG_BIN = existsSync(FFMPEG_FULL) ? FFMPEG_FULL : "ffmpeg";

const SOURCE_PRECEDENCE = ["b-roll.mp4", "edit.mp4", "clipped.mp4", "raw.mp4"];

/**
 * Fallbacks only. The real values come from the style's framing.zoom_punches —
 * how far and how slowly the camera drifts is part of the look, not a property
 * of the script.
 */
const DEFAULT_RAMP_IN_SEC = 2.2;
const DEFAULT_RAMP_OUT_SEC = 1.2;
const DEFAULT_AMOUNT = 0.08;

let RAMP_IN_SEC = DEFAULT_RAMP_IN_SEC;
let RAMP_OUT_SEC = DEFAULT_RAMP_OUT_SEC;

interface Region {
  start: number;
  end: number;
}

function findSource(dir: string): string | null {
  for (const name of SOURCE_PRECEDENCE) {
    const p = path.join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function probeFps(file: string): number {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries",
     "stream=r_frame_rate", "-of", "csv=p=0", file],
    { encoding: "utf8" }
  );
  const [num, den] = (r.stdout ?? "").trim().split("/");
  const fps = Number(num) / Number(den || 1);
  return Number.isFinite(fps) && fps > 0 ? fps : 30;
}

/**
 * Cut points on the EDIT timeline, derived from the segment durations.
 *
 * A push-in must live entirely inside one take. If a cut lands while the move
 * is running, the footage changes mid-push; if it lands at full scale, the new
 * take opens already zoomed and then pulls out. Both read exactly like the
 * zoom itself jumped.
 */
function segmentBounds(t: FinalTranscript): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let running = 0;
  for (const seg of t.segments) {
    const d = seg.end - seg.start;
    out.push({ start: running, end: running + d });
    running += d;
  }
  return out;
}

/**
 * Pulls a region inside whichever take contains its start, leaving room for the
 * full ramp-out before the cut. Returns null when what's left is too short to
 * be a move rather than a twitch.
 */
function fitToSegment(
  r: Region,
  bounds: { start: number; end: number }[]
): Region | null {
  const seg = bounds.find((b) => r.start >= b.start && r.start < b.end);
  if (!seg) return null;

  const EDGE = 0.35;
  const start = Math.max(r.start, seg.start + EDGE);
  const end = Math.min(r.end, seg.end - RAMP_OUT_SEC - EDGE);
  if (end - start < 2.0) return null;
  return { start, end };
}

function previewWords(t: FinalTranscript): { text: string; start: number }[] {
  const cumOffset: number[] = [];
  let running = 0;
  for (const seg of t.segments) {
    cumOffset.push(running);
    running += seg.end - seg.start;
  }
  return t.words
    .filter((w) => w.type === "word")
    .map((w) => ({
      text: w.text,
      start:
        w.start - t.segments[w.segmentIndex].start + cumOffset[w.segmentIndex],
    }));
}

async function pickRegions(
  t: FinalTranscript,
  durationSec: number
): Promise<Region[]> {
  const timeline = previewWords(t)
    .map((w) => `[${w.start.toFixed(2)}] ${w.text}`)
    .join(" ");
  // Sparingly: roughly one push per 12 seconds, and only where it earns it.
  const budget = Math.max(1, Math.round(durationSec / 12));

  const system = `You choose where a slow push-in should happen in a talking-head edit. The camera drifts closer over a couple of seconds, holds, then releases. It marks a moment as important without the viewer noticing the move.

Rules:
- At most ${budget} region(s) for this video. This is a rare emphasis, not a rhythm — most of the video should sit still.
- Each region is 2.5 to 6 seconds long and covers ONE complete thought — start it on the first word of the thought, end it on the last.
- Choose where the speaker makes a claim, names a consequence, or lands a payoff. Never on a filler phrase, a list of examples, or a setup clause.
- Leave at least 5 seconds of un-zoomed footage between regions. Constant movement defeats the purpose.
- Never start a region in the first 0.5s of the video.

Output raw JSON only, no markdown:
[{"start":1.20,"end":5.00}]`;

  const raw = await askClaude({
    system,
    messages: [
      {
        role: "user",
        content: `Video duration: ${durationSec.toFixed(1)}s\n\nWORD TIMELINE:\n${timeline}\n\nOutput the JSON array only.`,
      },
    ],
  });

  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON for zoom regions: ${raw.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed)) throw new Error("Zoom regions: expected an array");

  const out: Region[] = [];
  for (const entry of parsed) {
    const r = entry as Record<string, unknown>;
    if (typeof r.start !== "number" || typeof r.end !== "number") continue;
    if (r.end - r.start < 1.5) continue;
    // Overlapping pushes would compound into a much bigger zoom than intended.
    const prev = out.at(-1);
    if (prev && r.start < prev.end + 1.0) continue;
    out.push({ start: Math.max(0, r.start), end: Math.min(durationSec, r.end) });
  }
  return out.slice(0, budget);
}

/**
 * Builds the zoompan `z` expression.
 *
 * Each region contributes a smoothstep envelope (3u²-2u³) rising over
 * RAMP_IN_SEC and falling over RAMP_OUT_SEC. Smoothstep matters: a linear ramp
 * starts and stops at full velocity, which is exactly the abrupt feel we're
 * avoiding. `t` is not a variable inside zoompan, so time is derived from the
 * output frame counter.
 */
function buildZoomExpr(regions: Region[], amount: number, fps: number): string {
  const T = `(on/${fps.toFixed(6)})`;
  const smooth = (u: string) => `(3*pow(${u},2)-2*pow(${u},3))`;

  const envelopes = regions.map((r) => {
    const up = `clip((${T}-${r.start.toFixed(3)})/${RAMP_IN_SEC},0,1)`;
    const down = `clip((${r.end.toFixed(3)}+${RAMP_OUT_SEC}-${T})/${RAMP_OUT_SEC},0,1)`;
    return `${smooth(up)}*${smooth(down)}`;
  });

  const sum = envelopes.join("+");
  return `1+${amount}*min(1,${sum})`;
}

async function main() {
  const argv = process.argv.slice(2);
  const consumed = new Set<number>();
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    if (i === -1) return undefined;
    consumed.add(i).add(i + 1);
    return argv[i + 1];
  };

  const styleName = flag("--style") ?? "landscape-creator-b";
  const zoomSpec = loadStyle(styleName).framing.zoom_punches;

  // Flags override the style; the style overrides the fallbacks.
  RAMP_IN_SEC = Number(flag("--ramp-in") ?? (zoomSpec.attack_ms ?? 0) / 1000) || DEFAULT_RAMP_IN_SEC;
  RAMP_OUT_SEC = Number(flag("--ramp-out") ?? (zoomSpec.release_ms ?? 0) / 1000) || DEFAULT_RAMP_OUT_SEC;
  const amount =
    Number(flag("--amount") ?? (zoomSpec.scale ? zoomSpec.scale - 1 : 0)) || DEFAULT_AMOUNT;
  const prescale = Number(flag("--prescale") ?? 4);

  if (!zoomSpec.enabled && !flag("--regions")) {
    console.log(`Style "${styleName}" has zoom_punches disabled — leaving the footage still.`);
    return;
  }
  const regionsArg = flag("--regions");
  const folder = argv.find((_, i) => !consumed.has(i));

  if (!folder) {
    console.error(
      'Usage: npx tsx scripts/zoom.ts <content_folder> [--style <name>] [--amount 0.08] [--prescale 4] [--ramp-in 2.2] [--ramp-out 1.2] [--regions "s-e|s-e"]'
    );
    process.exit(1);
  }

  const dir = path.isAbsolute(folder) ? folder : path.resolve(folder);
  const source = findSource(dir);
  if (!source) {
    console.error(`Error: no source video in ${dir}`);
    process.exit(1);
  }

  const meta = await probe(source);
  const fps = probeFps(source);

  let regions: Region[];
  if (regionsArg) {
    regions = regionsArg.split("|").map((c) => {
      const [s, e] = c.split("-").map(Number);
      return { start: s, end: e };
    });
  } else {
    const transcriptPath = path.join(dir, "final_transcript.json");
    if (!existsSync(transcriptPath)) {
      console.error(`Error: final_transcript.json not found in ${dir}`);
      process.exit(1);
    }
    const transcript: FinalTranscript = JSON.parse(
      await fs.readFile(transcriptPath, "utf8")
    );
    console.log("  Picking push-in moments...");
    regions = await pickRegions(transcript, meta.durationSec);
  }

  // Every region — however it was chosen — gets pulled inside a single take.
  const transcriptForBounds = path.join(dir, "final_transcript.json");
  if (existsSync(transcriptForBounds)) {
    const t: FinalTranscript = JSON.parse(
      await fs.readFile(transcriptForBounds, "utf8")
    );
    const bounds = segmentBounds(t);
    const fitted: Region[] = [];
    for (const r of regions) {
      const f = fitToSegment(r, bounds);
      if (!f) {
        console.log(
          `    dropped ${r.start.toFixed(2)}–${r.end.toFixed(2)}s — crosses a cut with no room for the move`
        );
        continue;
      }
      if (f.start !== r.start || f.end !== r.end) {
        console.log(
          `    trimmed ${r.start.toFixed(2)}–${r.end.toFixed(2)} → ${f.start.toFixed(2)}–${f.end.toFixed(2)} (kept inside one take)`
        );
      }
      fitted.push(f);
    }
    regions = fitted;
  }

  if (regions.length === 0) {
    console.log("  No usable zoom regions — leaving the footage still.");
    return;
  }
  for (const r of regions) {
    console.log(`    push-in ${r.start.toFixed(2)}s → ${r.end.toFixed(2)}s`);
  }

  const z = buildZoomExpr(regions, amount, fps);
  const outPath = path.join(dir, "zoom.mp4");

  console.log(
    `  Rendering (amount=${amount.toFixed(3)}, ramps ${RAMP_IN_SEC}s/${RAMP_OUT_SEC}s, prescale=${prescale}x)...`
  );
  const started = Date.now();

  // Pre-scaling before zoompan is what keeps the move smooth: zoompan rounds
  // its crop window to whole pixels, and at native resolution that rounding
  // lands as a visible step every few frames.
  const vf = [
    `scale=iw*${prescale}:ih*${prescale}:flags=bicubic`,
    `zoompan=z='${z}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${meta.width}x${meta.height}:fps=${fps}`,
  ].join(",");

  const r = spawnSync(
    FFMPEG_BIN,
    [
      "-y", "-hide_banner", "-loglevel", "error",
      "-i", source,
      "-vf", vf,
      "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-c:a", "copy",
      outPath,
    ],
    { stdio: "pipe", encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.error(r.stderr?.split("\n").slice(-15).join("\n"));
    throw new Error(`ffmpeg exited ${r.status}`);
  }

  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`\n  ✓ ${outPath} (${secs}s)`);
  console.log(`  Next: npx tsx scripts/matte.ts "${dir}"`);
}

main().catch((err) => {
  console.error(`\n  zoom failed: ${err.message ?? err}`);
  process.exit(1);
});
