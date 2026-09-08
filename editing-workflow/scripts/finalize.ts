#!/usr/bin/env npx tsx
/**
 * finalize — last step of every /editing run.
 *
 * Collapses a content folder to exactly ONE video: edited_<title>.mp4.
 * Every intermediate stage output (raw.mp4, edit.mp4, subs.mp4, mask.mp4, ...)
 * is deleted. The user's original source file is never touched.
 *
 * Usage:
 *   npx tsx scripts/finalize.ts <content_folder> [--basename <name>]
 *
 *   --basename  original filename minus extension. Defaults to the folder name.
 */

import path from "path";
import { existsSync } from "fs";

import { finalizeContentFolder, fmtBytes } from "../src/lib/finalize";

async function main() {
  const argv = process.argv.slice(2);
  const consumed = new Set<number>();
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    if (i === -1) return undefined;
    consumed.add(i).add(i + 1);
    return argv[i + 1];
  };

  const basenameArg = flag("--basename");
  flag("--source"); // legacy no-op — the original is never touched anymore
  const folder = argv.find((_, i) => !consumed.has(i));
  if (!folder) {
    console.error("Usage: npx tsx scripts/finalize.ts <content_folder> [--basename <name>]");
    process.exit(1);
  }

  const dir = path.isAbsolute(folder) ? folder : path.resolve(folder);
  if (!existsSync(dir)) {
    console.error(`Error: folder not found: ${dir}`);
    process.exit(1);
  }

  const basename = basenameArg ?? path.basename(dir);

  const result = await finalizeContentFolder(dir, basename);

  console.log();
  console.log(`  Final  : ${result.finalPath}`);
  if (result.removed.length) {
    console.log(`  Removed: ${result.removed.join(", ")}`);
    console.log(`  Freed  : ${fmtBytes(result.freedBytes)}`);
  }
  console.log();
}

main().catch((err) => {
  console.error(`\n  finalize failed: ${err.message ?? err}`);
  process.exit(1);
});
