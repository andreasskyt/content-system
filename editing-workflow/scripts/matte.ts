#!/usr/bin/env npx tsx
/**
 * matte — per-frame person mask for the depth-header effect.
 *
 * Runs Apple's Vision person segmentation over a video (Neural Engine, ships
 * with macOS, no model download) and writes a grayscale mask.mp4 alongside the
 * source: white where the speaker is, black everywhere else. scripts/depth.ts
 * consumes it to composite text behind the subject.
 *
 * The mask is stored as plain grayscale rather than an alpha video on purpose —
 * libvpx in the local ffmpeg build silently drops the alpha channel on both VP8
 * and VP9, so a .webm matte would look correct in ffprobe and composite as fully
 * opaque. Luma survives H.264 intact.
 *
 * Usage:
 *   npx tsx scripts/matte.ts <content_folder|video> [--quality accurate|balanced|fast]
 *                                                   [--preview] [--force]
 */

import path from "path";
import fs from "fs/promises";
import { existsSync, statSync } from "fs";
import { spawn, spawnSync } from "child_process";

import { probe } from "../src/lib/ffmpeg";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const FFMPEG_FULL = "/usr/local/opt/ffmpeg-full/bin/ffmpeg";
const FFMPEG_BIN = existsSync(FFMPEG_FULL) ? FFMPEG_FULL : "ffmpeg";
const SWIFT_SRC = path.join(PROJECT_ROOT, "scripts", "matte", "PersonMatte.swift");
const SWIFT_BIN = path.join(PROJECT_ROOT, "scripts", "matte", "PersonMatte");

/** The mask stream has to be declared at the source's exact rate or the frames
 *  drift out of sync with the video during the composite. */
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

/** Stage outputs a mask can sensibly be built from, newest first. */
const SOURCE_PRECEDENCE = ["b-roll.mp4", "zoom.mp4", "edit.mp4", "clipped.mp4", "raw.mp4"];

function findSource(dir: string): string | null {
  for (const name of SOURCE_PRECEDENCE) {
    const p = path.join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/** Rebuilds the Swift helper when it's missing or older than its source. */
function ensureBinary(): void {
  const needsBuild =
    !existsSync(SWIFT_BIN) ||
    statSync(SWIFT_SRC).mtimeMs > statSync(SWIFT_BIN).mtimeMs;
  if (!needsBuild) return;

  console.log("  Building PersonMatte...");
  const r = spawnSync("swiftc", ["-O", "-o", SWIFT_BIN, SWIFT_SRC], {
    stdio: "pipe",
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(`swiftc failed:\n${r.stderr ?? ""}`);
  }
  console.log("  ✓ PersonMatte built");
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
  const has = (name: string): boolean => {
    const i = argv.indexOf(name);
    if (i !== -1) consumed.add(i);
    return i !== -1;
  };

  const quality = flag("--quality") ?? "accurate";
  const preview = has("--preview");
  const force = has("--force");
  const target = argv.find((_, i) => !consumed.has(i));

  if (!target) {
    console.error(
      "Usage: npx tsx scripts/matte.ts <content_folder|video> [--quality accurate|balanced|fast] [--preview] [--force]"
    );
    process.exit(1);
  }

  const resolved = path.isAbsolute(target) ? target : path.resolve(target);
  if (!existsSync(resolved)) {
    console.error(`Error: not found: ${resolved}`);
    process.exit(1);
  }

  const isDir = statSync(resolved).isDirectory();
  const source = isDir ? findSource(resolved) : resolved;
  if (!source) {
    console.error(
      `Error: no source video in ${resolved} — expected one of ${SOURCE_PRECEDENCE.join(", ")}`
    );
    process.exit(1);
  }
  const dir = isDir ? resolved : path.dirname(resolved);
  const maskPath = path.join(dir, "mask.mp4");

  const meta = await probe(source);
  const fps = probeFps(source);
  console.log(`  Source : ${source}`);
  console.log(`  Size   : ${meta.width}x${meta.height} · ${meta.durationSec.toFixed(1)}s · ${fps.toFixed(2)}fps`);
  console.log(`  Mask   : ${maskPath}`);

  if (existsSync(maskPath) && !force) {
    const maskAge = statSync(maskPath).mtimeMs;
    if (maskAge > statSync(source).mtimeMs) {
      console.log("  ✓ mask.mp4 is current — skipping (use --force to rebuild)");
      if (!preview) return;
    }
  }

  ensureBinary();

  if (!existsSync(maskPath) || force) {
    console.log(`  Segmenting (quality=${quality})...`);
    const started = Date.now();

    // PersonMatte streams raw gray8 frames; ffmpeg wraps them as H.264 luma.
    // Piping avoids writing thousands of PNGs for a single mask.
    const swift = spawn(SWIFT_BIN, [source, "--quality", quality], {
      stdio: ["ignore", "pipe", "inherit"],
    });
    const ff = spawn(
      FFMPEG_BIN,
      [
        "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo",
        "-pix_fmt", "gray",
        "-s", `${meta.width}x${meta.height}`,
        "-r", String(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "veryfast",
        // Near-lossless: a soft mask edge is the whole point, and banding here
        // shows up as a jagged silhouette in the composite.
        "-crf", "12",
        "-pix_fmt", "yuv420p",
        maskPath,
      ],
      { stdio: ["pipe", "inherit", "inherit"] }
    );
    swift.stdout.pipe(ff.stdin);

    const code = await new Promise<number>((resolve) => ff.on("close", resolve));
    if (code !== 0) throw new Error(`ffmpeg exited ${code} while writing the mask`);

    const secs = ((Date.now() - started) / 1000).toFixed(0);
    const mb = (statSync(maskPath).size / 1024 / 1024).toFixed(1);
    console.log(`  ✓ mask.mp4 written in ${secs}s (${mb} MB)`);
  }

  if (preview) {
    const outDir = path.join(dir, "matte-preview");
    await fs.mkdir(outDir, { recursive: true });
    const stamps = [0.2, 0.5, 0.8].map((f) => meta.durationSec * f);

    for (let i = 0; i < stamps.length; i++) {
      const out = path.join(outDir, `preview_${i + 1}.png`);
      // Source on the left, mask on the right — enough to judge whether the
      // silhouette is clean at hair and shoulder edges.
      const r = spawnSync(
        FFMPEG_BIN,
        [
          "-y", "-hide_banner", "-loglevel", "error",
          "-ss", stamps[i].toFixed(2), "-i", source,
          "-ss", stamps[i].toFixed(2), "-i", maskPath,
          "-filter_complex",
          "[0:v]scale=960:-2[a];[1:v]scale=960:-2,format=gray[b];[a][b]hstack=inputs=2",
          "-frames:v", "1", "-update", "1",
          out,
        ],
        { stdio: "pipe", encoding: "utf8" }
      );
      if (r.status !== 0) throw new Error(`preview ${i + 1} failed: ${r.stderr}`);
      console.log(`  ✓ ${out}`);
    }
    console.log("\n  Check the hair and shoulder edges before rendering the full video.");
  }
}

main().catch((err) => {
  console.error(`\n  matte failed: ${err.message ?? err}`);
  process.exit(1);
});
