#!/usr/bin/env npx tsx
/**
 * BRAND Multi-Video Pipeline — CLI
 *
 * Usage:
 *   npx tsx scripts/multi-pipeline.ts <video1> <video2> [...] [--title "Title"] [--instructions "..."]
 *
 * Takes N raw video takes, transcribes each, asks Claude to order them
 * (hook → body → CTA), concatenates them, and hands the merged video off
 * to the standard pipeline (pipeline.ts) for AI editing.
 *
 * Filename order is the default hint (raw1.mp4, raw2.mp4 or rawA.mp4, rawB.mp4).
 * Claude will re-order based on content if the narrative clearly disagrees.
 */

import path from "path";
import fs from "fs/promises";
import os from "os";
import { existsSync } from "fs";
import { spawnSync, spawn } from "child_process";

import { probe, extractAudio, concatClips, ensureDir } from "../src/lib/ffmpeg";
import { transcribeAudio } from "../src/lib/elevenlabs";
import { orderVideoSegments } from "../src/lib/claude";

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

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function parseArgs(argv: string[]): {
  videos: string[];
  title?: string;
  instructions?: string;
  withBroll: boolean;
  withSubs: boolean;
} {
  const videos: string[] = [];
  let title: string | undefined;
  let instructions: string | undefined;
  let withBroll = false;
  let withSubs = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--title" && argv[i + 1]) {
      title = argv[++i];
    } else if (argv[i] === "--instructions" && argv[i + 1]) {
      instructions = argv[++i];
    } else if (argv[i] === "--broll") {
      withBroll = true;
    } else if (argv[i] === "--subs") {
      withSubs = true;
      withBroll = true; // subs requires b-roll
    } else if (argv[i] === "--full") {
      withBroll = true;
      withSubs = true;
    } else {
      videos.push(argv[i]);
    }
  }
  return { videos, title, instructions, withBroll, withSubs };
}

function runAndCaptureResult(
  cmd: string,
  args: string[],
  cwd: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ["inherit", "pipe", "inherit"] });
    let captured: string | null = null;
    let captureNext = false;
    let buffer = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      process.stdout.write(text);
      buffer += text;

      // Parse line by line
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);

        if (captureNext) {
          const trimmed = line.trim();
          if (trimmed.startsWith("{")) {
            try {
              const obj = JSON.parse(trimmed);
              if (obj.contentFolder) captured = obj.contentFolder;
            } catch {}
          }
          captureNext = false;
          continue;
        }
        if (line.includes("__RESULT__")) {
          const after = line.split("__RESULT__").pop()?.trim() ?? "";
          if (after.startsWith("{")) {
            try {
              const obj = JSON.parse(after);
              if (obj.contentFolder) captured = obj.contentFolder;
            } catch {}
          } else {
            captureNext = true;
          }
        }
      }
    });

    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(`${cmd} exited ${code}`));
      resolve(captured);
    });
    child.on("error", reject);
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnv(projectRoot);

  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (parsed.videos.length < 2) {
    console.error(
      'Usage: npx tsx scripts/multi-pipeline.ts <video1> <video2> [...] [--title "Title"] [--instructions "..."]'
    );
    console.error("Need at least 2 video files. For a single video, use pipeline.ts.");
    process.exit(1);
  }

  // Resolve all video paths and verify they exist
  const resolvedVideos = parsed.videos.map((v) => path.resolve(v));
  for (const v of resolvedVideos) {
    if (!existsSync(v)) {
      console.error(`Error: file not found: ${v}`);
      process.exit(1);
    }
  }

  // Sort by natural filename order as the starting point
  resolvedVideos.sort((a, b) => naturalSort(path.basename(a), path.basename(b)));

  console.log("");
  console.log("  ═══════════════════════════════════════════════");
  console.log(`   Multi-Video Pipeline — ${resolvedVideos.length} takes`);
  console.log("  ═══════════════════════════════════════════════");
  console.log("");
  console.log("  Filename-sorted order:");
  resolvedVideos.forEach((v, i) => console.log(`    [${i + 1}] ${path.basename(v)}`));
  console.log("");

  // Prepare temp working directory
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "brand-multi-"));
  const log = (msg: string) => console.log(`[multi] ${msg}`);

  try {
    // 1. Probe + transcribe each video (sequential to avoid overloading ElevenLabs)
    log("Transcribing each take...");
    const takes: {
      videoPath: string;
      filename: string;
      meta: { durationSec: number; width: number; height: number };
      text: string;
    }[] = [];

    for (const v of resolvedVideos) {
      const filename = path.basename(v);
      log(`  Processing ${filename}...`);
      const meta = await probe(v);
      const audioPath = path.join(tmpDir, `${path.basename(v, path.extname(v))}.mp3`);
      await extractAudio(v, audioPath);
      const transcript = await transcribeAudio(audioPath);
      await fs.unlink(audioPath).catch(() => {});
      takes.push({
        videoPath: v,
        filename,
        meta,
        text: transcript.text,
      });
      log(`  ✓ ${filename} — ${meta.durationSec.toFixed(1)}s, ${transcript.text.split(/\s+/).length} words`);
    }
    console.log("");

    // 2. Ask Claude for the correct order (hook → body → CTA)
    log("Determining order (hook → body → CTA)...");
    const orderedFilenames = await orderVideoSegments(
      takes.map((t) => ({ filename: t.filename, text: t.text }))
    );

    // Reorder takes based on Claude's result
    const orderedTakes = orderedFilenames.map((name) => {
      const match = takes.find((t) => t.filename === name);
      if (!match) throw new Error(`Claude returned filename not in input: ${name}`);
      return match;
    });

    log("✓ Order determined:");
    orderedTakes.forEach((t, i) => log(`    [${i + 1}] ${t.filename}`));
    console.log("");

    // 3. Concatenate the videos in the determined order
    log("Concatenating videos...");
    const clipPaths = orderedTakes.map((t) => t.videoPath);
    const concatTxt = path.join(tmpDir, "concat.txt");
    const mergedPath = path.join(tmpDir, "merged.mp4");
    await concatClips(clipPaths, concatTxt, mergedPath);
    log(`✓ Merged → ${mergedPath}`);
    console.log("");

    // 4. Hand off to the standard pipeline
    log("Handing off to pipeline.ts...");
    console.log("");

    const title =
      parsed.title ??
      path.basename(orderedTakes[0].videoPath, path.extname(orderedTakes[0].videoPath));

    const pipelineArgs = [
      "tsx",
      path.join(projectRoot, "scripts", "pipeline.ts"),
      mergedPath,
      "--title",
      title,
    ];
    if (parsed.instructions) {
      pipelineArgs.push("--instructions", parsed.instructions);
    }

    // Run pipeline.ts and capture the __RESULT__ JSON to learn the content folder
    const contentFolder = await runAndCaptureResult("npx", pipelineArgs, projectRoot);
    if (!contentFolder) {
      throw new Error("pipeline.ts did not emit a content folder result");
    }

    // Optional: chain b-roll + subs
    if (parsed.withBroll) {
      console.log("");
      log("Running b-roll...");
      const brollResult = spawnSync(
        "npx",
        ["tsx", path.join(projectRoot, "scripts", "broll.ts"), contentFolder],
        { stdio: "inherit", cwd: projectRoot }
      );
      if (brollResult.status !== 0) throw new Error("broll.ts failed");
    }

    if (parsed.withSubs) {
      console.log("");
      log("Running subs...");
      const subsResult = spawnSync(
        "npx",
        ["tsx", path.join(projectRoot, "scripts", "subs.ts"), contentFolder],
        { stdio: "inherit", cwd: projectRoot }
      );
      if (subsResult.status !== 0) throw new Error("subs.ts failed");
    }

    console.log("");
    log(`✓ Done → ${contentFolder}`);
  } finally {
    // Clean up temp dir
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(`\nMulti-pipeline failed: ${err.message ?? err}`);
  process.exit(1);
});
