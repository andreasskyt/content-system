/**
 * finalize — collapse a content folder down to ONE video.
 *
 * Every pipeline stage writes its own video (edit.mp4 → b-roll.mp4 → subs.mp4 →
 * subs-music.mp4). Those intermediates are inputs to the next stage, so they
 * have to exist while the chain runs — but once the chain is done they're dead
 * weight, and at ~70-150MB each they add up fast across a batch.
 *
 * After finalize the folder holds exactly:
 *   edited_<title>.mp4 — the finished edit, and nothing else video-wise
 *
 * The user's original source file is NEVER touched — it stays where it is,
 * untouched. (Convention set 2026-08-27; replaces the old raw_/final_ pair.)
 *
 * Transcripts and style.json survive — they're kilobytes and they let a restyle
 * skip the paid transcription step.
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { readdirSync, statSync } from "fs";

/** Stage outputs in reverse chain order — the first one present is the newest. */
const STAGE_PRECEDENCE = [
  "sfx-music.mp4",
  "subs-music.mp4",
  "depth-music.mp4",
  "b-roll-music.mp4",
  "edit-music.mp4",
  "raw-music.mp4",
  "sfx.mp4",
  "subs.mp4",
  "depth.mp4",
  "b-roll.mp4",
  "zoom.mp4",
  "edit.mp4",
  "clipped.mp4",
];

/** Small, cheap to keep, and expensive to regenerate. Never deleted. */
const KEEP_EXTENSIONS = new Set([".json", ".md", ".txt", ".srt", ".vtt", ".ass"]);

export interface FinalizeResult {
  finalPath: string;
  removed: string[];
  freedBytes: number;
}

/** Picks the newest stage output in a content folder. */
export function findLatestStageOutput(dir: string): string | null {
  for (const name of STAGE_PRECEDENCE) {
    const p = path.join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * @param dir       content folder
 * @param basename  original source filename minus extension, verbatim
 * @param latest    the finished video; defaults to the newest stage output
 */
export async function finalizeContentFolder(
  dir: string,
  basename: string,
  latest?: string
): Promise<FinalizeResult> {
  const finalPath = path.join(dir, `edited_${basename}.mp4`);

  const produced = latest ?? findLatestStageOutput(dir);
  if (!produced) {
    throw new Error(
      `No finished video found in ${dir} — expected one of: ${STAGE_PRECEDENCE.join(", ")}`
    );
  }

  // 1. Promote the finished edit (rename, not copy — the stage file dies anyway).
  if (path.resolve(produced) !== path.resolve(finalPath)) {
    await fs.rename(produced, finalPath);
  }

  // 2. Everything else goes — including raw.mp4 and mask.mp4. Legacy raw_*.mp4
  //    files are moved-in originals from the old convention — deleting one would
  //    destroy the only copy, so they survive.
  const keep = new Set([path.basename(finalPath)]);
  const removed: string[] = [];
  let freedBytes = 0;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (keep.has(name) || name.startsWith(".") || name.startsWith("raw_") || name.startsWith("final_") || name.startsWith("edited_")) continue;

    const full = path.join(dir, name);
    if (entry.isDirectory()) {
      // Stage subfolders (edit/, output/) and Remotion temp dirs.
      freedBytes += dirSize(full);
      await fs.rm(full, { recursive: true, force: true });
      removed.push(`${name}/`);
      continue;
    }
    if (KEEP_EXTENSIONS.has(path.extname(name).toLowerCase())) continue;

    freedBytes += statSync(full).size;
    await fs.unlink(full);
    removed.push(name);
  }

  return { finalPath, removed, freedBytes };
}

function dirSize(dir: string): number {
  let total = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? dirSize(p) : statSync(p).size;
  }
  return total;
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
