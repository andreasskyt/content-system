#!/usr/bin/env npx tsx
/**
 * BRAND B-Roll Pipeline — CLI
 *
 * Usage:
 *   npx tsx scripts/broll.ts <content_folder> [--instructions "..."]
 *
 * Takes a completed editing pipeline content folder:
 *   generates b-roll cues → renders Remotion clips → composites onto preview
 *
 * Output: {folder}/b-roll: {title}.mp4
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { execSync } from "child_process";

import { probe } from "../src/lib/ffmpeg";
import { generateBRollCues } from "../src/lib/claude";
import type { BRollCue, BRollCueSet, FinalTranscript } from "../src/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

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

function parseArgs(argv: string[]): {
  folder: string;
  instructions?: string;
} {
  let folder = "";
  let instructions: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--instructions" && argv[i + 1]) {
      instructions = argv[++i];
    } else if (!folder) {
      folder = argv[i];
    }
  }
  return { folder, instructions };
}

function ffmpeg(args: string) {
  execSync(`ffmpeg ${args}`, { stdio: "pipe" });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnv(projectRoot);

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: npx tsx scripts/broll.ts <content_folder> [--instructions "..."]'
    );
    process.exit(1);
  }

  const parsed = parseArgs(args);
  let folder = parsed.folder;

  // Resolve path — accept full path, relative, or jobId for backwards compat
  if (!path.isAbsolute(folder)) {
    const asUploads = path.join(projectRoot, "uploads", folder);
    if (existsSync(asUploads)) {
      folder = asUploads;
    } else {
      folder = path.resolve(folder);
    }
  }

  if (!existsSync(folder)) {
    console.error(`Error: folder not found: ${folder}`);
    process.exit(1);
  }

  const title = path.basename(folder);
  const log = (msg: string) => console.log(`[${title}] ${msg}`);

  // Verify required files
  const transcriptPath = path.join(folder, "final_transcript.json");

  if (!existsSync(transcriptPath)) {
    console.error(
      `Error: final_transcript.json not found in ${folder}\nRun /editing first.`
    );
    process.exit(1);
  }

  // Find edit video (new flat structure → subfolder fallback → legacy)
  let editVideoPath = path.join(folder, "edit.mp4");
  if (!existsSync(editVideoPath)) {
    const editDir = path.join(folder, "edit");
    if (existsSync(editDir)) {
      const editFiles = (await fs.readdir(editDir)).filter(f => f.endsWith(".mp4"));
      if (editFiles.length > 0) editVideoPath = path.join(editDir, editFiles[0]);
    }
  }
  if (!existsSync(editVideoPath)) {
    const legacyPreview = path.join(folder, "output", "preview.mp4");
    if (existsSync(legacyPreview)) editVideoPath = legacyPreview;
  }
  if (!existsSync(editVideoPath)) {
    console.error(`Error: No edit video found in ${folder}\nRun /editing first.`);
    process.exit(1);
  }

  log(`Starting b-roll pipeline`);
  log(`Folder : ${folder}`);
  if (parsed.instructions) {
    log(`Custom : ${parsed.instructions.slice(0, 80)}${parsed.instructions.length > 80 ? "…" : ""}`);
  }
  console.log();

  // Load final transcript + probe preview
  const finalTranscript: FinalTranscript = JSON.parse(
    await fs.readFile(transcriptPath, "utf8")
  );
  const editMeta = await probe(editVideoPath);
  const editDurationSec = editMeta.durationSec;

  log(
    `✓ Loaded: ${finalTranscript.segments.length} segments · ${fmtDuration(editDurationSec)} preview · ${editMeta.width}x${editMeta.height}`
  );

  // ── Load manifest ───────────────────────────────────────────────────────

  const inspirationDir = path.join(projectRoot, "assets", "broll-inspiration");
  const manifestPath = path.join(inspirationDir, "manifest.md");
  let manifestText: string | undefined;
  if (existsSync(manifestPath)) {
    manifestText = await fs.readFile(manifestPath, "utf8");
  }

  // ── Generate b-roll cues ────────────────────────────────────────────────

  log(`  Generating b-roll cues...`);
  const cues = await generateBRollCues(
    finalTranscript,
    editDurationSec,
    parsed.instructions,
    manifestText
  );

  const cueSet: BRollCueSet = {
    cues,
    previewDurationSec: editDurationSec,
    generatedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(folder, "broll_cues.json"),
    JSON.stringify(cueSet, null, 2),
    "utf8"
  );

  const totalBRoll = cues.reduce((acc, c) => acc + c.durationSec, 0);
  const coveragePct = Math.round((totalBRoll / editDurationSec) * 100);
  log(`✓ ${cues.length} cues · ${fmtDuration(totalBRoll)} · ${coveragePct}% coverage`);

  if (cues.length === 0) {
    log(`  No b-roll cues generated — skipping render + composite`);
    return;
  }

  // ── Phase 3: Render each cue with Remotion ────────────────────────────

  const rendersDir = path.join(folder, "broll_renders");
  await fs.mkdir(rendersDir, { recursive: true });

  log(`  Rendering ${cues.length} Remotion clips...`);
  const remotionEntry = path.join(projectRoot, "src/remotion/index.ts");

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const outputPath = path.join(rendersDir, `${cue.id}.mp4`);
    const durationFrames = Math.round(cue.durationSec * 30);

    // Resolve image keys → staticFile-relative paths for Remotion
    const spec = { ...cue.animationSpec } as Record<string, unknown>;
    if (cue.animationSpec.template === "illustration" && cue.animationSpec.imageKey) {
      const imgPath = path.join(inspirationDir, cue.animationSpec.imageKey);
      if (existsSync(imgPath)) {
        // Copy to public/ so Remotion can serve it via staticFile()
        const publicDir = path.join(projectRoot, "public", "broll-inspiration");
        const destPath = path.join(publicDir, cue.animationSpec.imageKey);
        if (!existsSync(destPath)) {
          await fs.mkdir(publicDir, { recursive: true });
          await fs.copyFile(imgPath, destPath);
        }
        spec.imageSrc = `broll-inspiration/${cue.animationSpec.imageKey}`;
      }
    }
    if (cue.animationSpec.template === "showcase" && cue.animationSpec.imageKeys) {
      const publicDir = path.join(projectRoot, "public", "broll-inspiration");
      await fs.mkdir(publicDir, { recursive: true });
      const srcs: string[] = [];
      for (const k of cue.animationSpec.imageKeys) {
        const imgPath = path.join(inspirationDir, k);
        if (existsSync(imgPath)) {
          const destPath = path.join(publicDir, k);
          if (!existsSync(destPath)) await fs.copyFile(imgPath, destPath);
          srcs.push(`broll-inspiration/${k}`);
        }
      }
      spec.imageSrcs = srcs;
    }

    const props = {
      spec,
      durationFrames,
      widthOverride: editMeta.width,
      heightOverride: editMeta.height,
    };

    const propsFile = path.join(rendersDir, `${cue.id}_props.json`);
    await fs.writeFile(propsFile, JSON.stringify(props), "utf8");

    execSync(
      `npx remotion render "${remotionEntry}" BRollScene "${outputPath}" --props="${propsFile}"`,
      { stdio: "pipe", cwd: projectRoot }
    );

    await fs.unlink(propsFile).catch(() => {});
    log(`  ✓ Rendered ${cue.id} (${cue.durationSec}s)`);
  }

  // ── Phase 4: Composite onto preview (overlay approach — no split/concat) ──

  log(`  Compositing b-roll onto preview...`);

  // Sort cues by start time
  const sorted = [...cues].sort((a, b) => a.previewStart - b.previewStart);

  // Build FFmpeg complex filter: overlay each b-roll clip at its timestamp
  // Input 0 = preview, Inputs 1..N = b-roll renders
  const inputs = [`-i "${editVideoPath}"`];
  for (const cue of sorted) {
    const renderPath = path.join(rendersDir, `${cue.id}.mp4`);
    inputs.push(`-i "${renderPath}"`);
  }

  // Revert to split-concat approach which is proven reliable
  const tmpDir = path.join(folder, "tmp_composite");
  await fs.mkdir(tmpDir, { recursive: true });

  // Extract audio from preview
  ffmpeg(`-y -i "${editVideoPath}" -vn -c:a aac -b:a 192k "${path.join(tmpDir, "audio.aac")}"`);

  // Build segment list: [speaker, broll, speaker, broll, speaker, ...]
  const segments: { type: "speaker" | "broll"; start: number; end: number; cueId?: string }[] = [];
  let cursor = 0;

  for (const cue of sorted) {
    if (cue.previewStart > cursor + 0.01) {
      segments.push({ type: "speaker", start: cursor, end: cue.previewStart });
    }
    segments.push({
      type: "broll",
      start: cue.previewStart,
      end: cue.previewEnd,
      cueId: cue.id,
    });
    cursor = cue.previewEnd;
  }
  if (cursor < editDurationSec - 0.01) {
    segments.push({ type: "speaker", start: cursor, end: editDurationSec });
  }

  // Cut each segment with precise timestamps, matching pixel format + framerate
  const concatFiles: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const outFile = path.join(tmpDir, `part_${String(i).padStart(3, "0")}.mp4`);
    concatFiles.push(outFile);

    if (seg.type === "speaker") {
      ffmpeg(
        `-y -i "${editVideoPath}" -ss ${seg.start} -to ${seg.end} -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 30 -an "${outFile}"`
      );
    } else {
      const renderPath = path.join(rendersDir, `${seg.cueId}.mp4`);
      ffmpeg(
        `-y -i "${renderPath}" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 30 -an "${outFile}"`
      );
    }
  }

  // Concat with re-encode for clean timestamps
  const concatTxt = path.join(tmpDir, "concat.txt");
  await fs.writeFile(concatTxt, concatFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"), "utf8");
  const videoOnly = path.join(tmpDir, "video_only.mp4");
  ffmpeg(`-y -f concat -safe 0 -i "${concatTxt}" -c:v libx264 -preset fast -crf 18 -r 30 -pix_fmt yuv420p -an "${videoOnly}"`);

  // Mux video + audio
  const finalPath = path.join(folder, "b-roll.mp4");
  ffmpeg(
    `-y -i "${videoOnly}" -i "${path.join(tmpDir, "audio.aac")}" -c:v copy -c:a copy -map 0:v -map 1:a -shortest "${finalPath}"`
  );

  // Clean up tmp
  await fs.rm(tmpDir, { recursive: true, force: true });

  // ── Done ──────────────────────────────────────────────────────────────

  console.log();
  log(`✓ ─────────────────────────────────────────────`);
  log(`✓ DONE`);
  log(`  B-Roll : ${finalPath}`);
  log(`  Cues   : ${cues.length} (${coveragePct}% coverage)`);
  log(`✓ ─────────────────────────────────────────────`);

  console.log("\n__RESULT__");
  console.log(
    JSON.stringify({
      title,
      contentFolder: folder,
      brollVideo: finalPath,
      cueCount: cues.length,
      totalBRollSec: totalBRoll,
      coveragePct,
      completedAt: new Date().toISOString(),
    })
  );
}

main().catch((err) => {
  console.error(`\nB-roll pipeline failed: ${err.message ?? err}`);
  process.exit(1);
});
