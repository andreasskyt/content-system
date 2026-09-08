#!/usr/bin/env npx tsx
/**
 * depth — composites massive ALL-CAPS headers BEHIND the speaker.
 *
 * Layer order out of this script is background → header text → speaker. The
 * ordinary caption tiers are NOT drawn here; subs.ts runs afterwards and draws
 * them on top of depth.mp4, which is what keeps lower-third subtitles in front
 * of the speaker while the headers sit behind.
 *
 * Needs mask.mp4 from scripts/matte.ts; builds it automatically when missing.
 *
 * Usage:
 *   npx tsx scripts/depth.ts <content_folder> [--style <name>]
 *                            [--headers "WHEN I FIRST@1.2-3.4|I DIDNT KNOW@8.0-10.5"]
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import os from "os";
import { writeFileSync } from "fs";

import { probe } from "../src/lib/ffmpeg";
import { loadStyle } from "../src/styles";
import { askClaude } from "../src/lib/claude-cli";
import type { DepthHeaderSpec } from "../src/styles/types";
import type { FinalTranscript } from "../src/lib/types";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const FFMPEG_FULL = "/usr/local/opt/ffmpeg-full/bin/ffmpeg";
const FFMPEG_BIN = existsSync(FFMPEG_FULL) ? FFMPEG_FULL : "ffmpeg";
const FONTS_DIR = path.join(PROJECT_ROOT, "assets", "fonts");

const SOURCE_PRECEDENCE = ["b-roll.mp4", "zoom.mp4", "edit.mp4", "clipped.mp4", "raw.mp4"];

interface Header {
  text: string;
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

function fmtAssTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}

/** ASS alpha is inverted: 00 is opaque, FF is invisible. */
function assAlpha(opacity: number): string {
  return Math.max(0, Math.min(255, Math.round((1 - opacity) * 255)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

function hexToAssColor(hex: string): string {
  const h = hex.replace("#", "");
  return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
}

function escapeAssText(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

/** Rebuilds the caption timeline in preview space — the same remap b-roll uses. */
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

async function pickHeaders(
  t: FinalTranscript,
  spec: DepthHeaderSpec,
  durationSec: number
): Promise<Header[]> {
  const words = previewWords(t);
  const timeline = words
    .map((w) => `[${w.start.toFixed(2)}] ${w.text}`)
    .join(" ");
  const budget = Math.max(1, Math.floor((durationSec / 60) * spec.max_per_minute));

  const system = `You choose DEPTH HEADERS for a short-form video edit. A depth header is a massive line of text that sits BEHIND the speaker's head. It punctuates the video — it is not a subtitle track.

Rules:
- Aim for roughly one header every 9 seconds — about ${Math.max(1, Math.round(durationSec / 9))} for this video, and never more than ${budget}. Too few and the device disappears; too many and it stops meaning anything.
- A header is a HEADLINE, not a caption. It compresses what the speaker said into a statement that stands on its own.
- Use ONLY words the speaker actually says in the sentence you are covering. You MAY skip words to reach the point — you may NOT introduce vocabulary, claims, or emphasis that isn't there, and you may not reorder into something they didn't mean.
- ${spec.max_words} words or fewer. Aim for 14-24 characters including spaces so the line runs nearly the full frame width and its letters emerge on both sides of the speaker's head. Under 12 characters is too short.

THE TEST every header must pass — read it cold, with the sound off, knowing nothing about the video:
  1. Is it a complete thought? A fragment that starts or ends mid-clause fails.
  2. Does it carry the sentence's CLAIM, not a slice of its middle?
  3. If the sentence is built on a contrast, does the header keep BOTH halves of it?

WORKED EXAMPLE.
  Speaker: "here's the thing, it's not if your ads stop working, it's when."
  BAD:  "STOP WORKING, IT'S WHEN" — the tail of one clause welded to the head of the next. It drops "not if", so "it's when" contrasts with nothing. Meaningless on its own.
  GOOD: "IT'S NOT IF, IT'S WHEN" — skips the middle clause, keeps the whole if/when pivot the line is built on, and is a complete statement at 22 characters.
- These are the CORE points of the video and nothing else — the central claim, the turn the whole argument pivots on, the payoff. If the video has one thing a viewer should remember, that is a header. A supporting detail, an example, or a setup clause is NOT.
- Never mid-clause, never a filler phrase.
- Headers must not overlap and must sit at least 3 seconds apart.
- For any video longer than 12 seconds, return at least 2 headers. A single header across a whole video reads as an accident rather than a device.
- start is the timestamp of the header's first word. end is 0.6s after its last word.

Output raw JSON only, no markdown:
[{"text":"WHEN I FIRST","start":1.20,"end":3.40}]`;

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
    throw new Error(`Claude returned invalid JSON for depth headers: ${raw.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed)) throw new Error("Depth headers: expected an array");

  const out: Header[] = [];
  const dropped: string[] = [];
  for (const entry of parsed) {
    const r = entry as Record<string, unknown>;
    if (typeof r.text !== "string") continue;
    if (typeof r.start !== "number" || typeof r.end !== "number") continue;
    if (r.end <= r.start) continue;
    const wordCount = r.text.trim().split(/\s+/).length;
    if (wordCount > spec.max_words) {
      dropped.push(`"${r.text}" (${wordCount} words > ${spec.max_words})`);
      continue;
    }
    // Too short to span the frame — it would sit entirely behind the speaker.
    if (r.text.trim().length < 12) {
      dropped.push(`"${r.text}" (${r.text.trim().length} chars, too short to span)`);
      continue;
    }
    if (r.text.trim().length > 30) {
      dropped.push(`"${r.text}" (${r.text.trim().length} chars, too long to stay legible)`);
      continue;
    }
    // Skipping words is allowed; inventing them is not.
    const spoken = new Set(
      words.map((w) => w.text.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ""))
    );
    const invented = r.text
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ""))
      .filter((w) => w.length > 0 && !spoken.has(w));
    if (invented.length) {
      dropped.push(`"${r.text}" (words not spoken: ${invented.join(", ")})`);
      continue;
    }
    // A header that overlaps the previous one would stack two massive lines in
    // the same band — always a mistake, so drop rather than reflow.
    const prev = out.at(-1);
    if (prev && r.start < prev.end) {
      dropped.push(`"${r.text}" (overlaps previous)`);
      continue;
    }
    out.push({
      text: r.text.trim(),
      start: Math.max(0, r.start),
      end: Math.min(durationSec, r.end),
    });
  }
  if (dropped.length) {
    console.log(`    (dropped ${dropped.length}: ${dropped.join(", ")})`);
  }
  // The prompt asks for a floor, but the model is allowed to judge that a short
  // clip carries only one real claim. Surface it rather than padding the video
  // with a header that isn't a core point.
  const target = Math.max(1, Math.round(durationSec / 9));
  if (out.length < Math.min(2, target) && durationSec > 12) {
    console.log(
      `    note: only ${out.length} header(s) for ${durationSec.toFixed(0)}s — the model judged this clip to carry one core point. Pass --headers to override.`
    );
  }
  return out.slice(0, budget);
}

/**
 * Reads the person mask at a given moment and reports where the subject sits,
 * as fractions of frame height/width.
 *
 * A header only reads as depth when it actually crosses the speaker, and how
 * high the speaker sits in frame is a property of the SHOT, not of the style —
 * a desk-wide two-shot and an eye-level MCU put the head in completely
 * different places. Measuring beats guessing.
 */
function measureSubject(
  maskPath: string,
  atSec: number,
  band?: { y0: number; y1: number }
): { top: number; bottom: number; left: number; right: number } | null {
  const W = 192;
  const H = 108;
  const r = spawnSync(
    FFMPEG_BIN,
    [
      "-v", "error",
      "-ss", atSec.toFixed(2), "-i", maskPath,
      "-frames:v", "1",
      "-vf", `scale=${W}:${H}`,
      "-f", "rawvideo", "-pix_fmt", "gray", "-",
    ],
    { encoding: "buffer", maxBuffer: 1 << 24 }
  );
  const buf = r.stdout;
  if (!buf || buf.length < W * H) return null;

  const yFrom = band ? Math.max(0, Math.floor(band.y0 * H)) : 0;
  const yTo = band ? Math.min(H, Math.ceil(band.y1 * H)) : H;

  if (band) {
    // Banded mode: the text only has to clear what it crosses, and stray
    // slivers in the segmentation (a mic cable highlight, a whiteboard edge)
    // must not widen the box. Take the widest CONNECTED run of lit columns —
    // that's the head — and ignore everything else.
    const rows = yTo - yFrom;
    if (rows <= 0) return null;
    const colHits = new Array<number>(W).fill(0);
    for (let y = yFrom; y < yTo; y++) {
      for (let x = 0; x < W; x++) {
        if (buf[y * W + x] > 128) colHits[x]++;
      }
    }
    const lit = colHits.map((c) => c > rows * 0.25);
    let bestL = -1, bestR = -1, runL = -1, gap = 0;
    for (let x = 0; x <= W; x++) {
      if (x < W && lit[x]) {
        if (runL === -1) runL = x;
        gap = 0;
      } else if (runL !== -1 && (++gap > 3 || x === W)) {
        const runR = x - gap;
        if (runR - runL > bestR - bestL) { bestL = runL; bestR = runR; }
        runL = -1;
      }
    }
    if (bestL === -1) return null;
    return { top: yFrom / H, bottom: yTo / H, left: bestL / W, right: bestR / W };
  }

  let top = -1, bottom = -1, left = W, right = -1;
  for (let y = yFrom; y < yTo; y++) {
    let rowHits = 0;
    for (let x = 0; x < W; x++) {
      if (buf[y * W + x] > 128) {
        rowHits++;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
    // 2% of a row is enough to be the crown of a head and few enough to ignore
    // stray speckle in the segmentation.
    if (rowHits > W * 0.02) {
      if (top === -1) top = y;
      bottom = y;
    }
  }
  if (top === -1) return null;
  return { top: top / H, bottom: bottom / H, left: left / W, right: right / W };
}

/**
 * Font size that makes `text` span roughly target_width_pct of the frame.
 *
 * 0.43em is Montserrat Black's measured average advance at the negative
 * tracking this style uses — rendered through libass and measured off the
 * pixels, not taken from the font metrics. The earlier 0.62 estimate made
 * every header come out about a third too narrow.
 */
function fitFontSize(
  text: string,
  spec: DepthHeaderSpec,
  width: number,
  height: number
): number {
  const AVG_ADVANCE_EM = 0.43;
  const targetPx = width * (spec.target_width_pct / 100);
  const chars = Math.max(1, text.length);
  const ideal = targetPx / (chars * AVG_ADVANCE_EM);

  const min = height * (spec.min_font_size_pct_height / 100);
  const max = height * (spec.max_font_size_pct_height / 100);
  return Math.round(Math.max(min, Math.min(max, ideal)));
}

const AVG_ADVANCE_EM = 0.62;

const widthCache = new Map<string, number>();

/**
 * Actual rendered width of a string, measured by rasterising it through libass
 * and reading the ink extent.
 *
 * A character-count estimate is hopeless here: "IT'S NOT IF" averages 0.34em
 * per character while "MOMENTUM BROKE" averages 0.72em, and the stagger layout
 * needs the real number — a 2x error turns the intended overlap into a gap.
 */
function textWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
  spacing: string,
  bold: number,
  width: number,
  height: number
): number {
  const key = `${text}|${fontFamily}|${fontSize}|${spacing}|${bold}`;
  const hit = widthCache.get(key);
  if (hit !== undefined) return hit;

  const probe = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: M,${fontFamily},${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,${bold},0,0,0,100,100,${spacing},0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:01.00,M,,0,0,0,,{\\pos(0,0)}${escapeAssText(text)}
`;
  const tmp = path.join(os.tmpdir(), `brand-measure-${process.pid}.ass`);
  writeFileSync(tmp, probe, "utf8");

  const r = spawnSync(
    FFMPEG_BIN,
    [
      "-v", "error",
      "-f", "lavfi", "-i", `color=c=black:s=${width}x${height}:d=1`,
      "-vf", `subtitles=${path.basename(tmp)}:fontsdir=${FONTS_DIR}`,
      "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-",
    ],
    { cwd: os.tmpdir(), encoding: "buffer", maxBuffer: 1 << 28 }
  );

  let measured = text.length * AVG_ADVANCE_EM * fontSize;
  const buf = r.stdout;
  if (buf && buf.length >= width * height) {
    let right = -1;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = width - 1; x > right; x--) {
        if (buf[row + x] > 40) {
          right = x;
          break;
        }
      }
    }
    if (right > 0) measured = right + 1;
  }
  widthCache.set(key, measured);
  return measured;
}

/**
 * Breaks a header into two lines.
 *
 * Prefers a comma, because a header built on a contrast almost always carries
 * one at the pivot ("it's not if, it's when") and breaking there puts each half
 * of the contrast on its own line. Falls back to the word boundary nearest the
 * middle by character count, which keeps the two lines a similar length.
 */
function splitHeader(text: string): [string, string] | null {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return null;

  const commaIdx = words.findIndex((w) => w.endsWith(","));
  if (commaIdx >= 0 && commaIdx < words.length - 1) {
    return [
      words.slice(0, commaIdx + 1).join(" ").replace(/,$/, ""),
      words.slice(commaIdx + 1).join(" "),
    ];
  }

  const total = text.length;
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ").length;
    const diff = Math.abs(left - (total - left));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/**
 * Picks the block's left edge so the words that carry the point stay clear of
 * the speaker.
 *
 * The last word of each line is the one that matters — on a contrast header
 * that is the pivot ("...IF" / "...WHEN"), and it is exactly the word that ends
 * up dead centre, which is exactly where the head is. Candidate offsets are
 * scored by how much of those two words the silhouette covers.
 */
function placeBlockX(
  lines: [string, string],
  measure: (t: string) => number,
  overlapPx: number,
  width: number,
  subj: { left: number; right: number } | null
): number {
  const w1 = measure(lines[0]);
  const w2 = measure(lines[1]);
  const blockW = w1 - overlapPx + w2;
  const maxLeft = width - blockW - width * 0.03;
  const minLeft = width * 0.03;
  if (maxLeft <= minLeft) return Math.max(0, (width - blockW) / 2);

  const headL = subj ? subj.left * width : null;
  const headR = subj ? subj.right * width : null;

  // The trailing word of each line, which is what must survive.
  const key1 = lines[0].split(/\s+/).at(-1) ?? "";
  const key2 = lines[1].split(/\s+/).at(-1) ?? "";
  const k1w = measure(key1);
  const k2w = measure(key2);

  const occluded = (x: number, w: number): number => {
    if (headL === null || headR === null) return 0;
    const covered = Math.min(x + w, headR) - Math.max(x, headL);
    return covered <= 0 ? 0 : covered / w;
  };

  let bestLeft = (width - blockW) / 2;
  let bestScore = Infinity;
  for (let i = 0; i <= 20; i++) {
    const left = minLeft + ((maxLeft - minLeft) * i) / 20;
    const l2 = left + w1 - overlapPx;
    // Key words sit at the END of each line.
    const s = occluded(left + w1 - k1w, k1w) + occluded(l2 + w2 - k2w, k2w);
    // Nudge toward the frame's centre when scores tie, so the block doesn't
    // drift to an edge for no reason.
    const tiebreak = Math.abs(left + blockW / 2 - width / 2) / width;
    const score = s * 10 + tiebreak;
    if (score < bestScore) {
      bestScore = score;
      bestLeft = left;
    }
  }
  return bestLeft;
}

/**
 * Layout variants, rotated across a video's headers so they don't all read the
 * same. Every variant keeps whole words clear of the head — at most about half
 * a letterform tucks behind it.
 *
 *   flank    — one row: left half ends at the head's left edge, right half
 *              starts at its right edge, the head sits in the gap
 *   tower    — both lines stacked on whichever side of the head has more room
 *   diagonal — flank split across two rows: line 1 upper-left of the head,
 *              line 2 lower-right, reading across it
 *   stagger  — the original two-line staggered block; fallback when no mask
 *              box is available for the header
 */
type DepthLayout = "stagger" | "flank" | "diagonal" | "tower";
const LAYOUT_ROTATION: DepthLayout[] = ["flank", "tower", "diagonal"];

function buildAss(
  headers: (Header & {
    yPct?: number;
    subj?: { left: number; right: number } | null;
    layout?: DepthLayout;
    mid?: number;
  })[],
  spec: DepthHeaderSpec,
  fontFamily: string,
  width: number,
  height: number,
  maskPath?: string
): string {
  const colour = hexToAssColor(spec.color_hex);
  const bold = spec.font_weight >= 600 ? -1 : 0;

  const styleLines: string[] = [];
  const events = headers
    .map((h, idx) => {
      const text =
        spec.case === "upper"
          ? h.text.toUpperCase()
          : spec.case === "lower"
          ? h.text.toLowerCase()
          : h.text;
      const split = spec.two_line.enabled ? splitHeader(text) : null;

      // Size from the BLOCK's width, not one line's. Because the second line
      // starts before the first ends, the staggered block runs nearly the sum
      // of both lines — sizing off the longer line alone overruns the frame.
      const emMatch2 = /^(-?[\d.]+)em$/.exec(spec.letter_spacing.trim());
      const spacingAt = (fs: number) =>
        emMatch2 ? (parseFloat(emMatch2[1]) * fs).toFixed(1) : "0";

      // Rendered width scales linearly with font size (letter-spacing is
      // derived from it too), so one measurement at a reference size solves
      // for the size that makes the block hit its target width.
      const REF = 100;
      const measureAt = (t: string, fs: number) =>
        textWidth(t, fontFamily, fs, spacingAt(fs), bold, width, height);

      let fontSize: number;
      if (split) {
        const r1 = measureAt(split[0], REF) / REF;
        const r2 = measureAt(split[1], REF) / REF;
        const blockRatio = r1 + r2 - spec.two_line.overlap_pct * r1;
        const ideal = (width * (spec.target_width_pct / 100)) / blockRatio;
        fontSize = Math.round(
          Math.max(
            height * (spec.min_font_size_pct_height / 100),
            Math.min(height * (spec.max_font_size_pct_height / 100), ideal)
          )
        );
      } else {
        fontSize = fitFontSize(text, spec, width, height);
      }
      const sp = spacingAt(fontSize);
      // \an7 anchors each line at its own top-left, which is what makes the
      // stagger computable — bottom-centre anchoring can't express it.
      const align = split ? 7 : 2;
      styleLines.push(
        `Style: D${idx},${fontFamily},${fontSize},${colour},${colour},&H00000000,&H00000000,${bold},0,0,0,100,100,${sp},0,1,0,0,${align},20,20,0,1`
      );
      // Each header is placed against the subject as it is at that moment, so a
      // speaker who shifts mid-clip still gets crossed.
      const yPct = h.yPct ?? spec.vertical_position_pct_from_top;
      const baselineY = Math.round(height * (yPct / 100));
      const cx = Math.round(width / 2);

      const travel = Math.round(fontSize * spec.rise_em);
      const moveMs = Math.max(spec.fade_in_ms, 1);
      const fade = `\\fad(${spec.fade_in_ms},${spec.fade_out_ms})`;

      const durMs = Math.max(1, Math.round((h.end - h.start) * 1000));
      const sh = spec.shadow;
      // \fad forces full opacity at its peak, which would make the shadow solid
      // black. The long form lets the middle alpha stay where we set it.
      const shadowFade = `\\fade(255,${parseInt(assAlpha(sh.opacity), 16)},255,0,${spec.fade_in_ms},${Math.max(spec.fade_in_ms, durMs - spec.fade_out_ms)},${durMs})`;
      const shadowTags = `\\1c&H000000&\\3c&H000000&\\blur${(sh.blur_px / 2).toFixed(1)}`;

      /** One line becomes two events: blurred black twin on layer 0, text on layer 1. */
      const emit = (lineText: string, x: number, y: number): string => {
        const body = escapeAssText(lineText);
        const rows: string[] = [];
        if (sh.enabled) {
          const sx = Math.round(x + sh.offset_x_px);
          const sy = Math.round(y + sh.offset_y_px);
          rows.push(
            `Dialogue: 0,${fmtAssTime(h.start)},${fmtAssTime(h.end)},D${idx},,0,0,0,,` +
              `{${shadowFade}${shadowTags}\\move(${sx},${sy + travel},${sx},${sy},0,${moveMs})}${body}`
          );
        }
        rows.push(
          `Dialogue: 1,${fmtAssTime(h.start)},${fmtAssTime(h.end)},D${idx},,0,0,0,,` +
            `{${fade}\\move(${x},${y + travel},${x},${y},0,${moveMs})}${body}`
        );
        return rows.join("\n");
      };

      if (!split) {
        return emit(text, cx, baselineY);
      }

      const layout: DepthLayout = h.subj ? h.layout ?? "stagger" : "stagger";

      if (layout !== "stagger" && h.subj && maskPath && h.mid !== undefined) {
        // Side-anchored variants: whole words live beside the head, so the
        // word split is chosen to MAXIMISE the size both halves can render at.
        // The slop lets roughly half a letterform tuck behind the head — enough
        // to read as depth, never enough to hide a word.
        //
        // Each line gets its own head box, measured at the rows THAT line
        // occupies — the silhouette widens fast below the crown (ears), and a
        // box from the wrong rows hides whole letters.
        const margin = width * 0.03;
        const maxFs = Math.round(height * (spec.max_font_size_pct_height / 100));
        const words = text.trim().split(/\s+/);

        const ratio = (t: string) => measureAt(t, REF) / REF;
        // Quarter of a letterform: reads as depth without ever hiding enough
        // of a wide glyph (W, M) to change the word.
        const slopEm = 0.12;

        const fs0 = height * 0.12;
        const boxAt = (yTopPx: number): { left: number; right: number } => {
          const b = measureSubject(maskPath, h.mid!, {
            y0: Math.max(0, (yTopPx - fs0 * 0.1) / height),
            y1: Math.min(1, (yTopPx + fs0 * 1.1) / height),
          });
          return b ?? h.subj!;
        };
        const gap0 = fs0 * spec.two_line.line_gap_em;
        const box1 =
          layout === "flank"
            ? boxAt(baselineY - fs0 / 2)
            : boxAt(baselineY - gap0 / 2);
        const box2 = layout === "flank" ? box1 : boxAt(baselineY + gap0 / 2);
        // Left half sits beside box1's rows, right half beside box2's.
        const headL = box1.left * width;
        const headR = box2.right * width;

        const splits: [string, string][] = [];
        for (let i = 1; i < words.length; i++) {
          splits.push([words.slice(0, i).join(" "), words.slice(i).join(" ")]);
        }

        const sideTravelFor = (fs: number) => Math.round(fs * spec.rise_em);
        const emitAt = (lineText: string, x: number, y: number, fs: number): string => {
          const body = escapeAssText(lineText);
          const t = sideTravelFor(fs);
          const rows: string[] = [];
          if (sh.enabled) {
            const sx = Math.round(x + sh.offset_x_px);
            const sy = Math.round(y + sh.offset_y_px);
            rows.push(
              `Dialogue: 0,${fmtAssTime(h.start)},${fmtAssTime(h.end)},D${idx},,0,0,0,,` +
                `{${shadowFade}${shadowTags}\\move(${sx},${sy + t},${sx},${sy},0,${moveMs})}${body}`
            );
          }
          rows.push(
            `Dialogue: 1,${fmtAssTime(h.start)},${fmtAssTime(h.end)},D${idx},,0,0,0,,` +
              `{${fade}\\move(${x},${y + t},${x},${y},0,${moveMs})}${body}`
          );
          return rows.join("\n");
        };
        const setStyle = (fs: number) => {
          styleLines[styleLines.length - 1] =
            `Style: D${idx},${fontFamily},${fs},${colour},${colour},&H00000000,&H00000000,${bold},0,0,0,100,100,${spacingAt(fs)},0,1,0,0,7,20,20,0,1`;
        };

        if (layout === "tower") {
          // Both lines stacked on whichever side of the head has more room,
          // aligned to a shared edge, reading top to bottom past the head.
          // The shared edge must clear BOTH lines' head boxes.
          const edgeL = Math.min(box1.left, box2.left) * width;
          const edgeR = Math.max(box1.right, box2.right) * width;
          const availL = edgeL - margin;
          const availR = width - margin - edgeR;
          const side = availL >= availR ? "left" : "right";
          const avail = Math.max(availL, availR);
          let bestPair = split, bestFit = 0;
          for (const p of splits) {
            const fit = avail / Math.max(ratio(p[0]), ratio(p[1]));
            if (fit > bestFit) { bestFit = fit; bestPair = p; }
          }
          const fs = Math.round(Math.min(maxFs, bestFit + height * 0.01));
          setStyle(fs);
          const gap = fs * 1.04;
          const topY = Math.round(baselineY - gap / 2);
          const w1p = measureAt(bestPair[0], fs);
          const w2p = measureAt(bestPair[1], fs);
          const towerSlop = fs * slopEm;
          const x1 = side === "left" ? Math.max(margin, edgeL + towerSlop - w1p) : edgeR - towerSlop;
          const x2 = side === "left" ? Math.max(margin, edgeL + towerSlop - w2p) : edgeR - towerSlop;
          return [
            emitAt(bestPair[0], Math.round(x1), topY, fs),
            emitAt(bestPair[1], Math.round(x2), Math.round(topY + gap), fs),
          ].join("\n");
        }

        // flank / diagonal: pick the split that lets BOTH halves render biggest.
        let bestPair = split, bestFit = 0;
        for (const p of splits) {
          const r1 = ratio(p[0]);
          const r2 = ratio(p[1]);
          // slop scales with fs; solve fit = min-side width / ratio iteratively.
          let fs = maxFs;
          for (let iter = 0; iter < 3; iter++) {
            const slop = fs * slopEm;
            const fit = Math.min(
              (headL + slop - margin) / r1,
              (width - margin - (headR - slop)) / r2
            );
            fs = Math.min(maxFs, fit);
          }
          console.log(`      split "${p[0]}" / "${p[1]}" fits ${Math.round(fs)}px`);
          if (fs > bestFit) { bestFit = fs; bestPair = p; }
        }
        // No clamp UP to a floor here: forcing the size up pushes whole
        // letters behind the head, which is worse than slightly smaller type.
        const fs = Math.round(Math.min(maxFs, bestFit));
        const slop = fs * slopEm;
        setStyle(fs);

        const wL = measureAt(bestPair[0], fs);
        const xL = Math.max(margin, headL + slop - wL);
        const xR = Math.min(headR - slop, width - margin - measureAt(bestPair[1], fs));

        if (layout === "flank") {
          const y = Math.round(baselineY - fs / 2);
          return [
            emitAt(bestPair[0], Math.round(xL), y, fs),
            emitAt(bestPair[1], Math.round(xR), y, fs),
          ].join("\n");
        }
        // diagonal
        const gap = fs * spec.two_line.line_gap_em;
        const topY = Math.round(baselineY - gap / 2);
        return [
          emitAt(bestPair[0], Math.round(xL), topY, fs),
          emitAt(bestPair[1], Math.round(xR), Math.round(topY + gap), fs),
        ].join("\n");
      }

      // Staggered block: line 2 starts slightly BEFORE line 1 ends and sits a
      // line-gap below, so the two overlap horizontally without stacking into a
      // centred paragraph.
      const measure = (t: string) => measureAt(t, fontSize);
      const w1 = measure(split[0]);
      const overlapPx = w1 * spec.two_line.overlap_pct;
      const gap = fontSize * spec.two_line.line_gap_em;

      const left = placeBlockX(split, measure, overlapPx, width, h.subj ?? null);
      const topY = Math.round(baselineY - gap / 2);
      const rows: [string, number, number][] = [
        [split[0], left, topY],
        [split[1], left + w1 - overlapPx, topY + gap],
      ];

      return rows
        .map(([lineText, lx, ly]) => emit(lineText, Math.round(lx), Math.round(ly)))
        .join("\n");
    })
    .join("\n");

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styleLines.join("\n")}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}
`;
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
  const headersArg = flag("--headers");
  const folder = argv.find((_, i) => !consumed.has(i));

  if (!folder) {
    console.error(
      'Usage: npx tsx scripts/depth.ts <content_folder> [--style <name>] [--headers "TEXT@start-end|..."]'
    );
    process.exit(1);
  }

  const dir = path.isAbsolute(folder) ? folder : path.resolve(folder);
  if (!existsSync(dir)) {
    console.error(`Error: folder not found: ${dir}`);
    process.exit(1);
  }

  const style = loadStyle(styleName);
  const spec = style.subs.depth;
  if (!spec?.enabled) {
    console.error(
      `Style "${styleName}" has no enabled subs.depth block — nothing to composite.`
    );
    process.exit(1);
  }

  const source = findSource(dir);
  if (!source) {
    console.error(`Error: no source video in ${dir}`);
    process.exit(1);
  }
  const meta = await probe(source);

  const maskPath = path.join(dir, "mask.mp4");
  if (!existsSync(maskPath)) {
    console.log("  mask.mp4 missing — running matte first...");
    const r = spawnSync("npx", ["tsx", path.join(PROJECT_ROOT, "scripts", "matte.ts"), dir], {
      stdio: "inherit",
      cwd: PROJECT_ROOT,
    });
    if (r.status !== 0) throw new Error("matte.ts failed");
  }

  // Headers come from the flag when given, otherwise from the transcript.
  let headers: Header[];
  if (headersArg) {
    headers = headersArg.split("|").map((chunk) => {
      const m = /^(.*)@([\d.]+)-([\d.]+)$/.exec(chunk.trim());
      if (!m) throw new Error(`Bad --headers entry: ${chunk} (want "TEXT@start-end")`);
      return { text: m[1].trim(), start: Number(m[2]), end: Number(m[3]) };
    });
  } else {
    const transcriptPath = path.join(dir, "final_transcript.json");
    if (!existsSync(transcriptPath)) {
      console.error(
        `Error: final_transcript.json not found in ${dir}. Run pipeline.ts (or prep-for-broll.ts) first, or pass --headers.`
      );
      process.exit(1);
    }
    const transcript: FinalTranscript = JSON.parse(
      await fs.readFile(transcriptPath, "utf8")
    );
    console.log("  Picking depth headers...");
    headers = await pickHeaders(transcript, spec, meta.durationSec);
  }

  if (headers.length === 0) {
    console.log("  No depth headers selected — nothing to composite.");
    return;
  }
  for (const h of headers) {
    console.log(`    [${h.start.toFixed(2)}–${h.end.toFixed(2)}] ${h.text.toUpperCase()}`);
  }

  // Place each header so it crosses the speaker instead of floating above them.
  const fontFracH = spec.font_size_pct_height / 100;
  let rotationIdx = 0;
  const placed: (Header & {
    yPct?: number;
    subj?: { left: number; right: number } | null;
    layout?: DepthLayout;
    mid?: number;
  })[] = headers.map((h) => {
    const mid = (h.start + h.end) / 2;
    const subj = measureSubject(maskPath, mid);
    if (!subj) return { ...h };

    // Bottom of the text lands ~22% into the subject's height, which puts the
    // line across the forehead/hair rather than resting on the crown.
    const subjHeight = subj.bottom - subj.top;
    const yPct = (subj.top + subjHeight * 0.22) * 100;

    // Clamp into the top half — a header that drifts to mid-frame collides
    // with the caption tiers below.
    const clamped = Math.max(fontFracH * 100 + 2, Math.min(52, yPct));

    // The full-body box spans the shoulders and torso — half the frame — but
    // the text only has to clear what it actually crosses: the head. Re-measure
    // the silhouette in the band of rows the text occupies.
    const bandY0 = Math.max(0, clamped / 100 - fontFracH);
    const bandY1 = Math.min(1, clamped / 100 + fontFracH * 1.6);
    const headBand = measureSubject(maskPath, mid, { y0: bandY0, y1: bandY1 });
    const box = headBand ?? subj;

    const layout = LAYOUT_ROTATION[rotationIdx++ % LAYOUT_ROTATION.length];
    return { ...h, yPct: clamped, subj: { left: box.left, right: box.right }, layout, mid };
  });

  for (const h of placed) {
    if (h.yPct !== undefined) {
      console.log(
        `    placed "${h.text.toUpperCase()}" at y=${h.yPct.toFixed(1)}% (${h.layout}, head ${(h.subj!.left * 100).toFixed(0)}–${(h.subj!.right * 100).toFixed(0)}%)`
      );
    }
  }

  const assPath = path.join(dir, "depth.ass");
  await fs.writeFile(
    assPath,
    buildAss(placed, spec, spec.font_family, meta.width, meta.height, maskPath),
    "utf8"
  );

  const outPath = path.join(dir, "depth.mp4");
  console.log("  Compositing headers behind the speaker...");

  // split is required: the source feeds both the text layer and the matted
  // foreground. format=rgba before alphamerge is also required — without it the
  // foreground carries no alpha and covers the text completely.
  const filter = [
    "[0:v]split=2[base][fgsrc]",
    `[base]subtitles=${path.basename(assPath)}:fontsdir=${FONTS_DIR}[bg]`,
    "[fgsrc]format=rgba[fa]",
    // A one-pixel blur on the mask edge. The raw segmentation boundary is hard,
    // and a hard edge against 130px white type reads as a cut-out sticker; a
    // touch of softness lets the letters sit behind the speaker instead.
    "[1:v]format=gray,gblur=sigma=1.2[m]",
    "[fa][m]alphamerge[fg]",
    "[bg][fg]overlay=0:0[out]",
  ].join(";");

  const r = spawnSync(
    FFMPEG_BIN,
    [
      "-y", "-hide_banner", "-loglevel", "error",
      "-i", source,
      "-i", maskPath,
      "-filter_complex", filter,
      "-map", "[out]",
      "-map", "0:a?",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-c:a", "copy",
      "-fps_mode", "passthrough",
      outPath,
    ],
    { cwd: dir, stdio: "pipe", encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.error(r.stderr?.split("\n").slice(-20).join("\n"));
    throw new Error(`ffmpeg exited ${r.status}`);
  }

  console.log(`\n  ✓ ${outPath}`);
  console.log(`  Next: npx tsx scripts/subs.ts "${dir}" --style ${styleName}`);
}

main().catch((err) => {
  console.error(`\n  depth failed: ${err.message ?? err}`);
  process.exit(1);
});
