#!/usr/bin/env npx tsx
/**
 * subs-raw — Transcribe a raw video and burn karaoke subtitles onto it.
 *
 * Uses ffmpeg + libass (via ffmpeg-full). Preserves source frame timing
 * exactly (CFR or VFR) with -fps_mode passthrough. Audio stream copied.
 *
 * Usage: npx tsx scripts/subs-raw.ts <video_path>
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { spawnSync } from "child_process";

import { extractAudio, ensureDir, probe } from "../src/lib/ffmpeg";
import { transcribeAudio } from "../src/lib/elevenlabs";
import { reviewTranscript } from "../src/lib/transcript-review";
import { groupWordsIntoLines, type CaptionLine } from "../src/lib/subtitles";
import type { EditTimelineWord, ElevenLabsTranscript } from "../src/lib/types";
import { loadStyle, listStyles } from "../src/styles";
import { SHORT_FORM_DIR, LONG_FORM_DIR } from "../src/lib/constants";
import type { SubsSpec } from "../src/styles/types";

// ── Config ───────────────────────────────────────────────────────────────────

// ffmpeg-full is keg-only on Homebrew. Fall back to system ffmpeg if not installed.
const FFMPEG_FULL = "/usr/local/opt/ffmpeg-full/bin/ffmpeg";
const FFMPEG_BIN = existsSync(FFMPEG_FULL) ? FFMPEG_FULL : "ffmpeg";

const DEFAULT_STYLE = "youtube";

// How long a completed line lingers when nothing follows it soon.
const LINE_HOLD_SEC = 1.0;

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

function fmtAssTime(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s - h * 3600 - m * 60;
  // ASS wants H:MM:SS.cc (2 digits centiseconds)
  return `${h}:${String(m).padStart(2, "0")}:${rem.toFixed(2).padStart(5, "0")}`;
}

function hexToAssColor(hex: string): string {
  // #RRGGBB -> &H00BBGGRR
  const r = hex.slice(1, 3);
  const g = hex.slice(3, 5);
  const b = hex.slice(5, 7);
  return `&H00${b}${g}${r}`.toUpperCase();
}

function escapeAssText(s: string): string {
  // Escape the minimum set that libass treats specially in dialogue text
  return s.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

interface Layout {
  fontSize: number;
  marginL: number;
  marginR: number;
  marginV: number;
  maxChars: number;
}

/**
 * Resolves the caption box. `xCenterPct` is where the block is centered
 * horizontally (50 = frame center, 16.7 = middle of the left third); the box is
 * the widest span that stays symmetric around it, so the text reads as centered
 * on that anchor.
 */
function computeLayout(
  width: number,
  height: number,
  subs: SubsSpec,
  xCenterPct: number,
  yPctFromTop: number
): Layout {
  const fontSize = Math.round(height * (subs.font_size_pct_height / 100));
  // ASS MarginV is measured from the bottom; the style anchors from the top.
  const marginV = Math.round(height * (1 - yPctFromTop / 100));

  const centerX = width * (xCenterPct / 100);
  const gutter = Math.round(width * 0.02);
  const half = Math.max(fontSize, Math.min(centerX, width - centerX) - gutter);
  const marginL = Math.max(0, Math.round(centerX - half));
  const marginR = Math.max(0, Math.round(width - (centerX + half)));

  // WrapStyle 2 disables auto-wrap, so an over-long line would run off frame
  // instead of breaking. Cap the line length to what the box actually fits.
  // Poppins Bold averages ~0.55em per glyph.
  const fitChars = Math.floor((half * 2) / (fontSize * 0.55));
  const maxChars = Math.min(subs.max_chars_per_line, fitChars);

  return { fontSize, marginL, marginR, marginV, maxChars };
}

function generateAss(
  lines: CaptionLine[],
  width: number,
  height: number,
  subs: SubsSpec,
  layout: Layout
): string {
  const { fontSize, marginL, marginR, marginV } = layout;
  const border = subs.outline ?? {
    width_pct_of_font: 0.1,
    shadow_pct_of_font: 0.04,
    color_hex: "#000000",
  };
  const box = subs.background_box;
  // ASS's native Shadow is a hard offset copy — no blur. A soft halo is built
  // instead from a black outline widened to the blur radius and softened with
  // \blur on each event (see blurTag below).
  const soft = subs.text_shadow;
  // BorderStyle 3 fills a box behind each text run with OutlineColour; the
  // Outline width becomes the box padding. Per-word \alpha overrides apply to
  // the box too, so with cumulative reveal the box builds along with the words.
  const borderStyle = box ? 3 : 1;
  // blur/8 for the outline width and blur/4 for the \blur radius is the pair
  // that reads as a soft halo hugging the glyphs. Widening the outline past
  // this turns the shadow into a visible grey slab behind the line.
  const outline = soft
    ? Math.max(1, Math.round(soft.blur_px / 8))
    : Math.round(
        fontSize * (box ? box.padding_pct_of_font : border.width_pct_of_font)
      );
  const shadow = soft
    ? soft.offset_y_px
    : box
    ? 0
    : Math.round(fontSize * border.shadow_pct_of_font);
  const cumulative = subs.reveal === "cumulative";

  const BASE = hexToAssColor(subs.color_standard_hex);
  const ACTIVE = cumulative ? BASE : hexToAssColor(subs.keyword.tint_hex);
  const boxAlpha = box
    ? Math.max(0, Math.min(255, Math.round((1 - box.opacity) * 255)))
        .toString(16)
        .padStart(2, "0")
        .toUpperCase()
    : "00";
  const softAlpha = soft
    ? Math.max(0, Math.min(255, Math.round((1 - soft.opacity) * 255)))
        .toString(16)
        .padStart(2, "0")
        .toUpperCase()
    : "00";
  const OUTLINE_COL = box
    ? `&H${boxAlpha}${hexToAssColor(box.color_hex).slice(4)}`
    : soft
    ? `&H${softAlpha}${hexToAssColor(soft.color_hex).slice(4)}`
    : hexToAssColor(border.color_hex);
  const bold = subs.font_weight_standard >= 600 ? -1 : 0;
  // ASS's Spacing field is absolute pixels, so an em-based tracking value has
  // to be resolved against the computed font size. Non-em units are ignored
  // rather than guessed at.
  const emMatch = /^(-?[\d.]+)em$/.exec(subs.letter_spacing.trim());
  const spacing = emMatch
    ? (parseFloat(emMatch[1]) * fontSize).toFixed(1)
    : "0";
  const fadeMs =
    subs.animation_in_standard === "fade" ? subs.animation_in_duration_ms : 0;

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${subs.font_family},${fontSize},${BASE},${BASE},${OUTLINE_COL},&H80000000,${bold},0,0,0,100,100,${spacing},0,${borderStyle},${outline},${shadow},2,${marginL},${marginR},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events: string[] = [];

  // A line appears slightly before its first word lands.
  const lineIn = (line: CaptionLine) => Math.max(0, line.words[0].start - 0.08);

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    const nextLine = lines[l + 1];
    // A finished line holds until the next one appears, so the caption never
    // blinks out between lines during continuous speech — and never overlaps
    // it, which libass would render as a second stacked row.
    const lineEnd = Math.min(
      line.end + LINE_HOLD_SEC,
      nextLine ? lineIn(nextLine) : Infinity
    );

    for (let i = 0; i < line.words.length; i++) {
      const word = line.words[i];
      const nextWord = line.words[i + 1];
      const isLast = i === line.words.length - 1;

      const eventStart = i === 0 ? lineIn(line) : word.start;
      const eventEnd = isLast ? lineEnd : Math.min(nextWord.start, lineEnd);
      if (eventEnd <= eventStart) continue;

      // Every event carries the FULL line so each word keeps the exact slot it
      // will occupy for the whole line. Cumulative reveal hides the not-yet-
      // spoken words with alpha instead of omitting them — omitting them would
      // re-center the line and shift every word already on screen. The newest
      // word fades up in place rather than snapping on.
      // A fade longer than its own event would be cut off mid-way and the next
      // event would snap the word to full opacity — the pop reads as jerky.
      const fade = Math.min(fadeMs, Math.round((eventEnd - eventStart) * 1000));

      const text = line.words
        .map((w, j) => {
          const safe = escapeAssText(w.text);
          if (!cumulative) {
            return j === i ? `{\\c${ACTIVE}}${safe}{\\c${BASE}}` : safe;
          }
          // Component alphas (\1a text, \3a box/outline) instead of \alpha —
          // a blanket \alpha&H00& would force the background box fully opaque,
          // ignoring the style's box opacity.
          if (j > i) return `{\\1a&HFF&\\3a&HFF&}${safe}`;
          if (j === i && fade > 0) {
            return `{\\1a&HFF&\\3a&HFF&\\t(0,${fade},\\1a&H00&\\3a&H${boxAlpha}&)}${safe}`;
          }
          return `{\\1a&H00&\\3a&H${boxAlpha}&}${safe}`;
        })
        .join(" ");

      const blurTag = soft ? `{\\blur${(soft.blur_px / 4).toFixed(1)}}` : "";
      events.push(
        `Dialogue: 0,${fmtAssTime(eventStart)},${fmtAssTime(eventEnd)},Default,,0,0,0,,${blurTag}${text}`
      );
    }
  }

  return header + events.join("\n") + "\n";
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnv(projectRoot);

  const argv = process.argv.slice(2);
  const flagIdx = new Set<number>();
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    if (i === -1) return undefined;
    flagIdx.add(i).add(i + 1);
    return argv[i + 1];
  };

  const styleName = flag("--style") ?? DEFAULT_STYLE;
  // Per-video position overrides — the style stays untouched.
  const xPctArg = flag("--x-pct");
  const yPctArg = flag("--y-pct");
  const positional = argv.filter((_, i) => !flagIdx.has(i));

  const rawArg = positional[0];
  if (!rawArg) {
    console.error(
      `Usage: npx tsx scripts/subs-raw.ts <video_path> [--style <name>] [--x-pct <n>] [--y-pct <n>]\n` +
        `  --x-pct  horizontal center of the caption block, % of width (default 50)\n` +
        `  --y-pct  vertical anchor, % of height from the top (default: style)\n` +
        `  Styles: ${listStyles().join(", ")}`
    );
    process.exit(1);
  }
  const videoPath = path.resolve(
    rawArg.replace(/\\ /g, " ").replace(/^['"]|['"]$/g, "")
  );

  const subs = loadStyle(styleName).subs;

  if (!existsSync(videoPath)) {
    console.error(`\n  Error: file not found: ${videoPath}`);
    process.exit(1);
  }

  const baseName = path.basename(videoPath, path.extname(videoPath));

  // Detect format and build content folder — same convention as pipeline.ts
  const meta = await probe(videoPath);
  const isPortrait = meta.height > meta.width;
  const isShortForm =
    isPortrait || meta.durationSec < 180 || (meta.durationSec < 300 && isPortrait);
  const format = isShortForm ? SHORT_FORM_DIR : LONG_FORM_DIR;
  const contentBase =
    process.env.CONTENT_BASE ?? "[CONTENT_ROOT]";

  const videoDir = path.dirname(videoPath);
  const isInsideContentFolder =
    videoDir.startsWith(path.join(contentBase, SHORT_FORM_DIR)) ||
    videoDir.startsWith(path.join(contentBase, LONG_FORM_DIR));
  const dir = isInsideContentFolder
    ? videoDir
    : path.join(contentBase, format, baseName);

  await ensureDir(dir);

  // Copy raw video into the content folder as raw.mp4 (preserve the original; never move)
  const rawDest = path.join(dir, "raw.mp4");
  let sourceForPipeline = videoPath;
  if (!isInsideContentFolder && !existsSync(rawDest)) {
    await fs.copyFile(videoPath, rawDest);
    sourceForPipeline = rawDest;
  } else if (existsSync(rawDest)) {
    sourceForPipeline = rawDest;
  }

  const outputPath = path.join(dir, "subs.mp4");
  const tmpDir = path.join(dir, `.tmp-subs-raw-${Date.now()}`);

  console.log();
  console.log(`  File   : ${path.basename(videoPath)}`);
  console.log(`  Style  : ${styleName}`);
  console.log(`  Format : ${format} (${meta.width}x${meta.height})`);
  console.log(`  Output : ${outputPath}`);
  console.log(`  FFmpeg : ${FFMPEG_BIN}`);
  console.log();

  await ensureDir(tmpDir);

  // Reuse a previous transcript so restyling the same video doesn't re-bill Scribe.
  const transcriptPath = path.join(dir, "transcript.json");
  let transcript: ElevenLabsTranscript;
  if (existsSync(transcriptPath)) {
    console.log("  Reusing existing transcript.json");
    transcript = JSON.parse(await fs.readFile(transcriptPath, "utf8"));
    if (!transcript.reviewed) {
      transcript = await reviewTranscript(transcript, (m) => console.log(m));
      await fs.writeFile(transcriptPath, JSON.stringify(transcript, null, 2), "utf8");
    }
  } else {
    console.log("  Extracting audio...");
    const audioPath = path.join(tmpDir, "audio.mp3");
    await extractAudio(sourceForPipeline, audioPath);
    console.log("  ✓ Audio extracted");

    console.log("  Transcribing with ElevenLabs Scribe...");
    transcript = await transcribeAudio(audioPath);
    await fs.writeFile(transcriptPath, JSON.stringify(transcript, null, 2), "utf8");
  }
  const wordCount = transcript.words.filter((w) => w.type === "word").length;
  console.log(`  ✓ ${wordCount} words`);

  const editWords: EditTimelineWord[] = transcript.words
    .filter((w) => w.type === "word")
    .map((w) => ({ text: w.text, start: w.start, end: w.end }));

  const layout = computeLayout(
    meta.width,
    meta.height,
    subs,
    xPctArg ? Number(xPctArg) : 50,
    yPctArg ? Number(yPctArg) : subs.vertical_position_pct_from_top
  );

  const lines = groupWordsIntoLines(editWords, {
    maxWordsPerLine: subs.max_words_per_line,
    maxCharsPerLine: layout.maxChars,
    pauseThresholdSec: subs.pause_threshold_sec,
    punctuationIncluded: subs.punctuation_included,
  });
  console.log(`  ✓ ${lines.length} caption lines (max ${layout.maxChars} chars)`);

  // Generate ASS subtitle file
  const assPath = path.join(dir, "subs.ass");
  const assContent = generateAss(lines, meta.width, meta.height, subs, layout);
  await fs.writeFile(assPath, assContent, "utf8");

  // Burn subtitles with ffmpeg. Run with cwd=dir so we can pass a relative
  // filename to the subtitles filter (avoids libass path-escaping hell).
  console.log();
  console.log("  Burning subtitles with ffmpeg...");
  const ffArgs = [
    "-y",
    "-hide_banner",
    "-i", sourceForPipeline,
    // Without fontsdir libass only sees system-installed fonts, so every
    // preset silently fell back to a default sans. The bundled faces in
    // assets/fonts are the ones the styles actually name.
    "-vf", `subtitles=subs.ass:fontsdir=${path.join(projectRoot, "assets", "fonts")}`,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    "-fps_mode", "passthrough",
    "-movflags", "+faststart",
    outputPath,
  ];

  const result = spawnSync(FFMPEG_BIN, ffArgs, {
    stdio: "inherit",
    cwd: dir,
  });

  // Clean up tmp audio
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

  if (result.status !== 0) {
    console.error(`\n  ffmpeg exited with status ${result.status}`);
    process.exit(1);
  }

  console.log();
  console.log(`  ✓ Done — ${path.basename(outputPath)}`);
  console.log(`  → ${outputPath}`);
  console.log();
}

main().catch((err) => {
  console.error(`\n  subs-raw failed: ${err.message ?? err}`);
  process.exit(1);
});
