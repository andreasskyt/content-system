#!/usr/bin/env npx tsx
/**
 * compile-testimonial — assemble a testimonial ad from pre-cut clips.
 *
 * Reads a clips.json describing an ordered list of segments, trims each one,
 * NORMALIZES it to a single canvas (scale + pad), and concatenates them into a
 * single finished video. Built for mixed-source footage (4K portrait riverside
 * interviews, 1080x1920 selfies, 1920x1080 landscape) — normalization is what
 * lets them concat without glitching.
 *
 * No transcription, no AI, no full-video processing. ffmpeg seeks straight to
 * each timestamp. A 1.5h source is never decoded end-to-end.
 *
 * clips.json format:
 *   [
 *     { "file": "/abs/path/clip.mp4", "start": 12.3, "end": 15.0, "label": "hook" },
 *     { "file": "selfie.mov" }                      // start/end optional = whole clip
 *   ]
 * Relative file paths resolve against the clips.json directory first, then cwd.
 *
 * Usage:
 *   npx tsx scripts/compile-testimonial.ts <clips.json> [--out out.mp4]
 *        [--canvas 1080x1350] [--fps 30] [--pad-color black]
 *
 * Defaults: canvas 1080x1350 (4:5 feed), fps 30, output next to clips.json.
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

interface ClipSpec {
  file: string;
  start?: number;
  end?: number;
  label?: string;
  /** ffmpeg crop "w:h:x:y" applied BEFORE scaling (e.g. interview split-screen → client half). */
  crop?: string;
  /** "cover" = scale-to-fill + center-crop (single subject). "contain" = scale-to-fit + pad (default).
   *  "card" = scale-to-fit inside a centered rounded-corner card on the bg color (orientation-agnostic;
   *  the right look for landscape canvases fed mixed portrait/landscape sources). */
  fit?: "cover" | "contain" | "card";
  /** pad color for "contain" fit; overrides global default. Accepts #RRGGBB or ffmpeg color name. */
  padColor?: string;
  /** "rounded" = render inside an inset rounded-corner black frame (matches interview look). */
  frame?: "rounded";
  /** per-clip audio gain in dB (e.g. 14 to lift a quiet selfie source to match the rest). */
  gain?: number;
}

/** Build a per-clip filtergraph. crop → fit (cover/contain) → optional rounded frame → setsar/fps/format. */
function buildVf(
  spec: ClipSpec,
  cw: number,
  ch: number,
  fps: number,
  defaultPad: string
): string {
  const norm = (c: string) => (c.startsWith("#") ? "0x" + c.slice(1) : c);
  const parts: string[] = [];
  if (spec.crop) parts.push(`crop=${spec.crop}`);

  if (spec.frame === "rounded") {
    // Render inside an inset rounded-corner black frame (matches interview panel look).
    // Inner aspect MATCHES canvas aspect so 9:16 sources fill exactly without internal
    // pad bars colliding with the corner radius. Margin is uniform-ish horizontally;
    // vertical margin auto-derives so inner aspect = canvas aspect.
    const marginX = 20;
    const radius = 40;
    const iw = cw - marginX * 2;
    const ih = Math.round((iw * ch) / cw);
    const marginY = Math.round((ch - ih) / 2);
    const r2 = radius * radius;
    // geq math: replace pixels OUTSIDE the rounded rect with black (luma=0, chroma=128).
    const cornerCheck =
      `gte(pow(max(0\\,abs(X-W/2)-(W/2-${radius}))\\,2)+pow(max(0\\,abs(Y-H/2)-(H/2-${radius}))\\,2)\\,${r2})`;
    parts.push(
      // Always contain (zoomed out) inside the inner frame.
      `scale=${iw}:${ih}:force_original_aspect_ratio=decrease`,
      `pad=${iw}:${ih}:(ow-iw)/2:(oh-ih)/2:black`,
      // Upsample chroma so geq corner math is pixel-accurate on all planes.
      `format=yuv444p`,
      `geq=lum='if(${cornerCheck}\\,0\\,p(X\\,Y))':cb='if(${cornerCheck}\\,128\\,p(X\\,Y))':cr='if(${cornerCheck}\\,128\\,p(X\\,Y))'`,
      `pad=${cw}:${ch}:${marginX}:${marginY}:black`
    );
  } else if (spec.fit === "card") {
    // Scale-to-fit inside a centered rounded-corner card on the bg color. Orientation-agnostic:
    // a 9:16 source becomes a tall card, a 16:9 source a wide card, both centered on the bg.
    // Corner pixels are filled with the SAME color as the surrounding pad, so the rounded corners
    // blend seamlessly into the background. Done in rgb24 so the fill color is exact.
    const bg = norm(spec.padColor ?? defaultPad); // 0xRRGGBB
    const r = parseInt(bg.slice(2, 4), 16);
    const g = parseInt(bg.slice(4, 6), 16);
    const b = parseInt(bg.slice(6, 8), 16);
    const margin = 70; // bg gutter around the card
    const maxW = cw - margin * 2;
    const maxH = ch - margin * 2;
    const radius = 36;
    const r2 = radius * radius;
    // geq runs on the SCALED card frame: W/H are the card's runtime dims. Replace pixels OUTSIDE
    // the rounded rect with the bg color.
    const outside =
      `gte(pow(max(0\\,abs(X-W/2)-(W/2-${radius}))\\,2)+pow(max(0\\,abs(Y-H/2)-(H/2-${radius}))\\,2)\\,${r2})`;
    parts.push(
      `scale=${maxW}:${maxH}:force_original_aspect_ratio=decrease`,
      `setsar=1`,
      `format=rgb24`,
      `geq=r='if(${outside}\\,${r}\\,r(X\\,Y))':g='if(${outside}\\,${g}\\,g(X\\,Y))':b='if(${outside}\\,${b}\\,b(X\\,Y))'`,
      `pad=${cw}:${ch}:(ow-iw)/2:(oh-ih)/2:color=${bg}`
    );
  } else if ((spec.fit ?? "contain") === "cover") {
    parts.push(
      `scale=${cw}:${ch}:force_original_aspect_ratio=increase`,
      `crop=${cw}:${ch}`
    );
  } else {
    const pad = norm(spec.padColor ?? defaultPad);
    parts.push(
      `scale=${cw}:${ch}:force_original_aspect_ratio=decrease`,
      `pad=${cw}:${ch}:(ow-iw)/2:(oh-ih)/2:${pad}`
    );
  }
  parts.push("setsar=1", `fps=${fps}`, "format=yuv420p");
  return parts.join(",");
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      flags[key] = argv[i + 1];
      i++;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

async function probeHasAudio(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet", "-select_streams", "a", "-show_entries",
      "stream=index", "-of", "csv=p=0", filePath,
    ]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const clipsJsonArg = positional[0];
  if (!clipsJsonArg) {
    console.error(
      "Usage: npx tsx scripts/compile-testimonial.ts <clips.json> [--out out.mp4] [--canvas 1080x1350] [--fps 30] [--pad-color black]"
    );
    process.exit(1);
  }

  const clipsJsonPath = path.resolve(clipsJsonArg);
  if (!existsSync(clipsJsonPath)) {
    console.error(`\n  Error: clips file not found: ${clipsJsonPath}`);
    process.exit(1);
  }
  const baseDir = path.dirname(clipsJsonPath);

  const canvas = flags.canvas ?? "1080x1350";
  const [cw, ch] = canvas.split("x").map((n) => parseInt(n, 10));
  if (!cw || !ch) {
    console.error(`\n  Error: bad --canvas "${canvas}" (expected WxH, e.g. 1080x1350)`);
    process.exit(1);
  }
  const fps = parseInt(flags.fps ?? "30", 10);
  const padColor = flags["pad-color"] ?? "#303b2f"; // BRAND deep green
  const outPath = path.resolve(
    flags.out ?? path.join(baseDir, path.basename(clipsJsonPath).replace(/\.clips\.json$|\.json$/i, "") + ".mp4")
  );

  const clips: ClipSpec[] = JSON.parse(await fs.readFile(clipsJsonPath, "utf8"));
  if (!Array.isArray(clips) || clips.length === 0) {
    console.error("\n  Error: clips.json must be a non-empty array");
    process.exit(1);
  }

  const tmpDir = path.join(
    baseDir,
    `.tmp-compile-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  await fs.mkdir(tmpDir, { recursive: true });

  console.log(`\n  Canvas : ${cw}x${ch} @ ${fps}fps`);
  console.log(`  Clips  : ${clips.length}`);
  console.log(`  Output : ${outPath}\n`);

  const normalized: string[] = [];
  for (let i = 0; i < clips.length; i++) {
    const spec = clips[i];
    let srcPath = path.isAbsolute(spec.file) ? spec.file : path.join(baseDir, spec.file);
    if (!existsSync(srcPath)) {
      const cwdTry = path.resolve(spec.file);
      if (existsSync(cwdTry)) srcPath = cwdTry;
    }
    if (!existsSync(srcPath)) {
      console.error(`  ✗ [${i + 1}] file not found: ${spec.file}`);
      await fs.rm(tmpDir, { recursive: true, force: true });
      process.exit(1);
    }

    const outClip = path.join(tmpDir, `clip_${String(i).padStart(3, "0")}.mp4`);
    const hasAudio = await probeHasAudio(srcPath);
    const vf = buildVf(spec, cw, ch, fps, padColor);

    const args: string[] = ["-hide_banner", "-loglevel", "error"];
    if (spec.start != null) args.push("-ss", String(spec.start));
    if (spec.end != null) args.push("-to", String(spec.end));
    args.push("-i", srcPath);
    args.push("-vf", vf);
    if (!hasAudio) {
      // synthesize silence so every normalized clip has an audio track (clean concat)
      args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000", "-shortest");
    } else if (spec.gain) {
      args.push("-af", `volume=${spec.gain}dB`);
    }
    args.push(
      "-c:v", "libx264", "-preset", "fast", "-crf", "18",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
      "-r", String(fps), "-y", outClip
    );

    const range = spec.start != null ? `${spec.start}s–${spec.end ?? "end"}s` : "whole clip";
    console.log(`  → [${i + 1}/${clips.length}] ${spec.label ?? path.basename(spec.file)} (${range})`);
    await execFileAsync("ffmpeg", args);
    normalized.push(outClip);
  }

  // Concat normalized clips (identical params → safe stream copy)
  const concatTxt = path.join(tmpDir, "concat.txt");
  await fs.writeFile(
    concatTxt,
    normalized.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"),
    "utf8"
  );

  console.log(`\n  Concatenating ${normalized.length} clips...`);
  await execFileAsync("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", concatTxt,
    "-c", "copy", "-y", outPath,
  ]);

  await fs.rm(tmpDir, { recursive: true, force: true });

  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", outPath,
  ]);
  const dur = parseFloat(stdout.trim());
  console.log(`\n  ✓ Done — ${dur.toFixed(1)}s`);
  console.log(`  ✓ Saved: ${outPath}\n`);
}

main().catch((err) => {
  console.error(`\n  Compile failed: ${err.message ?? err}`);
  process.exit(1);
});
