import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

// ── Probe ─────────────────────────────────────────────────────────────────────

export interface VideoMeta {
  durationSec: number;
  width: number;
  height: number;
}

export async function probe(filePath: string): Promise<VideoMeta> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_streams",
    filePath,
  ]);

  const data = JSON.parse(stdout);
  const video = data.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video"
  );

  if (!video) throw new Error("No video stream found");

  let width: number = video.width ?? 0;
  let height: number = video.height ?? 0;

  // Check for rotation in side_data_list (common with phone-recorded MOVs)
  const sideData = video.side_data_list as Array<{ rotation?: number }> | undefined;
  const rotation = sideData?.find((d) => d.rotation != null)?.rotation ?? 0;
  if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
    [width, height] = [height, width];
  }

  return {
    durationSec: parseFloat(video.duration ?? "0"),
    width,
    height,
  };
}

// ── Audio extraction ──────────────────────────────────────────────────────────

export async function extractAudio(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-i",
    inputPath,
    "-vn",
    "-acodec",
    "libmp3lame",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "64k",
    "-y",
    outputPath,
  ]);
}

// ── Clip cutting ──────────────────────────────────────────────────────────────

export async function cutClip(
  inputPath: string,
  outputPath: string,
  start: number,
  end: number
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-i",
    inputPath,
    "-ss",
    String(start),
    "-to",
    String(end),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-r",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-y",
    outputPath,
  ]);
}

// ── Concat ────────────────────────────────────────────────────────────────────

export async function concatClips(
  clipPaths: string[],
  concatTxtPath: string,
  outputPath: string
): Promise<void> {
  const lines = clipPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");
  await fs.writeFile(concatTxtPath, lines, "utf8");

  await execFileAsync("ffmpeg", [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatTxtPath,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-r",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-y",
    outputPath,
  ]);
}

// ── Ensure dir ────────────────────────────────────────────────────────────────

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

// ── Resolve ffmpeg path ───────────────────────────────────────────────────────

export async function checkFfmpeg(): Promise<void> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    await execFileAsync("ffprobe", ["-version"]);
  } catch {
    throw new Error(
      "ffmpeg/ffprobe not found. Install via: brew install ffmpeg"
    );
  }
}
