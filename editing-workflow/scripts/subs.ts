#!/usr/bin/env npx tsx
/**
 * BRAND Subtitles — CLI
 *
 * Usage:
 *   npx tsx scripts/subs.ts <content_folder> [--style <name>]
 *
 * Loads an EditStyle preset from src/styles/<name>.ts and renders styled
 * subtitles composited with the b-roll video. Default style: brand.
 *
 * Creator A example: npx tsx scripts/subs.ts <folder> --style creator-a
 *
 * Output: subs.mp4 in the content folder.
 */

import path from "path";
import fs from "fs/promises";
import { existsSync, readdirSync } from "fs";
import { execSync } from "child_process";

import { probe, ensureDir } from "../src/lib/ffmpeg";
import {
  remapWordsToEditTimeline,
  groupWordsIntoLines,
  filterBrollOverlaps,
} from "../src/lib/subtitles";
import { tagKeywords, passthroughNoKeywordsFn } from "../src/lib/keyword-tagger";
import { loadStyle, listStyles } from "../src/styles";
import type { FinalTranscript, BRollCueSet } from "../src/lib/types";

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

function findVideo(dir: string, baseName: string): string | null {
  const flat = path.join(dir, `${baseName}.mp4`);
  if (existsSync(flat)) return flat;
  const sub = path.join(dir, baseName);
  if (existsSync(sub)) {
    const files = readdirSync(sub).filter((f) => f.endsWith(".mp4"));
    if (files.length > 0) return path.join(sub, files[0]);
  }
  return null;
}

type BlendMode = "difference" | "exclusion" | "normal";

function parseArgs(argv: string[]): {
  folder?: string;
  styleName: string;
  noGear2: boolean;
  chunks: number;
  yPct?: number;
  blend?: BlendMode;
} {
  let folder: string | undefined;
  let styleName = "brand";
  let noGear2 = false;
  let chunks = 1;
  let yPct: number | undefined;
  let blend: BlendMode | undefined;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--style") {
      styleName = argv[++i] ?? styleName;
    } else if (a === "--y-pct") {
      // Per-video vertical override, % from the top. Leaves the preset alone.
      yPct = Number(argv[++i]);
    } else if (a === "--blend") {
      // Per-video blend override. "normal" drops the x-ray inversion so words
      // paint as flat color_standard_hex, keeping the rest of the treatment.
      blend = argv[++i] as BlendMode;
    } else if (a === "--no-gear-2") {
      noGear2 = true;
    } else if (a === "--chunks") {
      // Render in N frame-range passes, then concat. Keeps Remotion's frame
      // temp bounded on tight disks (each pass cleans up before the next).
      chunks = Math.max(1, parseInt(argv[++i] ?? "1", 10) || 1);
    } else if (!folder) {
      folder = a;
    }
  }
  return { folder, styleName, noGear2, chunks, yPct, blend };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnv(projectRoot);

  const { folder, styleName, noGear2, chunks, yPct, blend } = parseArgs(process.argv);
  if (!folder) {
    console.error(
      `Usage: npx tsx scripts/subs.ts <content_folder> [--style <name>]\n\nAvailable styles: ${listStyles().join(", ")}`
    );
    process.exit(1);
  }

  const dir = path.isAbsolute(folder) ? folder : path.resolve(folder);
  if (!existsSync(dir)) {
    console.error(`Error: folder not found: ${dir}`);
    process.exit(1);
  }

  let style;
  try {
    style = loadStyle(styleName);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  if (yPct !== undefined && Number.isFinite(yPct)) {
    style.subs = { ...style.subs, vertical_position_pct_from_top: yPct };
  }

  if (blend) {
    style.subs = {
      ...style.subs,
      xray_difference: { ...style.subs.xray_difference, blend_mode: blend },
    };
  }

  if (!style.subs.enabled) {
    console.log(`[${styleName}] subs.enabled is false — skipping subtitle render.`);
    return;
  }

  const title = path.basename(dir);
  const log = (msg: string) => console.log(`[${title}] ${msg}`);

  // Find input video: prefer b-roll, fall back to clipped/edit
  // depth.mp4 is the b-roll stage with the depth headers already composited
  // behind the speaker, so it has to win over b-roll/edit when it exists.
  let inputVideoPath = findVideo(dir, "depth");

  if (!inputVideoPath) {
    inputVideoPath = findVideo(dir, "b-roll");
  }
  let inputLabel = "b-roll";
  if (!inputVideoPath) {
    inputVideoPath = findVideo(dir, "zoom");
    inputLabel = "zoom";
  }
  if (!inputVideoPath) {
    inputVideoPath = findVideo(dir, "clipped");
    inputLabel = "clipped";
  }
  if (!inputVideoPath) {
    inputVideoPath = findVideo(dir, "edit");
    inputLabel = "edit";
  }
  if (!inputVideoPath) {
    inputVideoPath = findVideo(dir, "raw");
    inputLabel = "raw";
  }
  if (!inputVideoPath) {
    console.error(`Error: No b-roll/clipped/edit/raw video found in ${dir}`);
    process.exit(1);
  }

  const transcriptPath = path.join(dir, "final_transcript.json");
  if (!existsSync(transcriptPath)) {
    console.error(`Error: final_transcript.json not found in ${dir}`);
    process.exit(1);
  }

  log(`Style  : ${style.meta.name}`);
  log(`Input  : ${inputLabel}.mp4`);
  console.log();

  // 1. Remap words to edit timeline
  const finalTranscript: FinalTranscript = JSON.parse(
    await fs.readFile(transcriptPath, "utf8")
  );
  const editWords = remapWordsToEditTimeline(finalTranscript);
  log(`✓ ${editWords.length} words remapped to edit timeline`);

  // 2. Group into lines using style's chunking config
  let lines = groupWordsIntoLines(editWords, {
    maxWordsPerLine: style.subs.max_words_per_line,
    maxCharsPerLine: style.subs.max_chars_per_line,
    pauseThresholdSec: style.subs.pause_threshold_sec,
    punctuationIncluded: style.subs.punctuation_included,
  });

  // 3. Filter out lines that overlap with b-roll
  const cuesPath = path.join(dir, "broll_cues.json");
  if (existsSync(cuesPath)) {
    const cueSet: BRollCueSet = JSON.parse(
      await fs.readFile(cuesPath, "utf8")
    );
    const brollWindows = cueSet.cues.map((c) => ({
      start: c.previewStart,
      end: c.previewEnd,
    }));
    const before = lines.length;
    lines = filterBrollOverlaps(lines, brollWindows);
    log(`✓ ${lines.length} subtitle lines (${before - lines.length} skipped during b-roll)`);
  } else {
    log(`✓ ${lines.length} subtitle lines`);
  }

  // 4. Tag keywords if the style wants them
  let taggedLines;
  if (
    style.subs.keyword.enabled &&
    style.subs.keyword.picking_strategy === "ai-pick"
  ) {
    log(`  Tagging keywords with Claude Haiku...`);
    try {
      taggedLines = await tagKeywords(lines);
      const kwCount = taggedLines.reduce(
        (acc, l) => acc + l.words.filter((w) => w.isKeyword).length,
        0
      );
      const g2Count = taggedLines.filter((l) => l.gear === 2).length;
      const g1Count = taggedLines.length - g2Count;
      log(
        `✓ ${kwCount} keywords tagged · gear distribution: ${g1Count} × Gear 1, ${g2Count} × Gear 2`
      );
      if (g2Count > 0) {
        const g2Lines = taggedLines
          .filter((l) => l.gear === 2)
          .map((l) => `"${l.words.map((w) => w.text).join(" ")}"`)
          .join("; ");
        log(`  Gear 2 hooks: ${g2Lines}`);
      }
    } catch (err: any) {
      log(`  ! keyword tagging failed (${err.message}), continuing without`);
      taggedLines = passthroughNoKeywordsFn(lines);
    }
  } else {
    taggedLines = passthroughNoKeywordsFn(lines);
  }

  if (noGear2) {
    const before = taggedLines.filter((l) => l.gear === 2).length;
    taggedLines = taggedLines.map((l) => ({ ...l, gear: 1 as const }));
    log(`  --no-gear-2 active: coerced ${before} Gear-2 line(s) → Gear 1`);
  }

  // 5. Probe video for dimensions + duration. Style canvas can override output
  // dimensions (e.g. CreatorC forces 1080×1920 even on landscape sources).
  const meta = await probe(inputVideoPath);
  const outWidth = style.canvas.output_width ?? meta.width;
  const outHeight = style.canvas.output_height ?? meta.height;
  const durationFrames = Math.round(meta.durationSec * 30);
  const sizeNote =
    outWidth === meta.width && outHeight === meta.height
      ? `${meta.width}x${meta.height}`
      : `${meta.width}x${meta.height} → ${outWidth}x${outHeight} (canvas override)`;
  log(`✓ Video: ${sizeNote}, ${meta.durationSec.toFixed(1)}s (${durationFrames} frames)`);

  // 6. Stage input video for Remotion's staticFile()
  const tmpPublicDir = path.join(projectRoot, "public", "tmp-subs");
  await ensureDir(tmpPublicDir);
  const tmpVideoName = `input-${Date.now()}.mp4`;
  const tmpVideoPath = path.join(tmpPublicDir, tmpVideoName);
  await fs.copyFile(inputVideoPath, tmpVideoPath);
  log(`✓ Staged input video for Remotion`);

  // 7. Render StyledCaptionedVideo
  log(`  Rendering captioned video with Remotion...`);
  const tmpDir = path.join(dir, ".tmp_subs");
  await ensureDir(tmpDir);

  const outputPath = path.join(dir, "subs.mp4");
  const remotionEntry = path.join(projectRoot, "src/remotion/index.ts");

  const props = {
    videoSrc: `tmp-subs/${tmpVideoName}`,
    lines: taggedLines,
    subsStyle: style.subs,
    canvasStyle: style.canvas,
    framingStyle: style.framing,
    durationFrames,
    widthOverride: outWidth,
    heightOverride: outHeight,
  };

  const propsFile = path.join(tmpDir, "captioned_props.json");
  await fs.writeFile(propsFile, JSON.stringify(props), "utf8");

  // Snapshot the chosen style alongside the output so the folder is reproducible.
  await fs.writeFile(
    path.join(dir, "style.json"),
    JSON.stringify({ name: styleName, style }, null, 2),
    "utf8"
  );

  const renderRange = (
    outPath: string,
    frameRange?: string,
    muted?: boolean
  ) => {
    const flag =
      (frameRange ? ` --frames=${frameRange}` : "") + (muted ? " --muted" : "");
    execSync(
      `npx remotion render "${remotionEntry}" StyledCaptionedVideo "${outPath}" --props="${propsFile}"${flag}`,
      { stdio: "inherit", cwd: projectRoot }
    );
  };

  try {
    if (chunks <= 1) {
      renderRange(outputPath);
    } else {
      // Chunked render: split the timeline into N frame ranges, render each to
      // its own file (Remotion frees its frame temp between passes). Bounds peak
      // scratch-disk to ~one chunk's frames — the only way a multi-minute 1080p
      // render fits on a near-full disk.
      //
      // Chunks are rendered VIDEO-ONLY (--muted). Concatenating per-chunk audio
      // accumulates AAC priming padding at each join, which drifts lip-sync and
      // inflates duration (so -shortest would clip frames off the end). Instead
      // we concat the muted video (clean CFR, frame-exact) and lay the original
      // continuous audio from the staged input back over it.
      const per = Math.ceil(durationFrames / chunks);
      const chunkFiles: string[] = [];
      for (let i = 0; i < chunks; i++) {
        const start = i * per;
        if (start >= durationFrames) break;
        const end = Math.min(durationFrames - 1, (i + 1) * per - 1);
        const chunkPath = path.join(tmpDir, `chunk-${String(i).padStart(2, "0")}.mp4`);
        log(`  Chunk ${i + 1}/${chunks}: frames ${start}-${end} (video-only)`);
        renderRange(chunkPath, `${start}-${end}`, true);
        chunkFiles.push(chunkPath);
      }
      const listFile = path.join(tmpDir, "concat.txt");
      await fs.writeFile(
        listFile,
        chunkFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"),
        "utf8"
      );
      const concatVideo = path.join(tmpDir, "concat-video.mp4");
      log(`  Concatenating ${chunkFiles.length} video chunks`);
      execSync(
        `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${concatVideo}"`,
        { stdio: "inherit", cwd: projectRoot }
      );
      log(`  Muxing original audio → subs.mp4`);
      execSync(
        `ffmpeg -y -i "${concatVideo}" -i "${tmpVideoPath}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${outputPath}"`,
        { stdio: "inherit", cwd: projectRoot }
      );
    }
  } finally {
    await fs.unlink(tmpVideoPath).catch(() => {});
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  log(`✓ Rendered subs.mp4`);

  console.log();
  log(`✓ ─────────────────────────────────────────────`);
  log(`✓ DONE`);
  log(`  Style: ${style.meta.name}`);
  log(`  Subs : ${outputPath}`);
  log(`✓ ─────────────────────────────────────────────`);
}

main().catch((err) => {
  console.error(`\nSubtitles failed: ${err.message ?? err}`);
  process.exit(1);
});
