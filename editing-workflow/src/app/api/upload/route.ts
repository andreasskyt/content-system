import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getJob, jobDir, setStage, updateJob, contentRoot, setJobFolder } from "@/lib/jobStore";
import { probe } from "@/lib/ffmpeg";
import { ensureDir } from "@/lib/ffmpeg";
import { SHORT_FORM_DIR, LONG_FORM_DIR } from "@/lib/constants";

const ALLOWED_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const jobId = formData.get("jobId") as string;
  const file = formData.get("video") as File;

  if (!jobId || !file) {
    return NextResponse.json({ error: "jobId and video required" }, { status: 400 });
  }

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: `Unsupported file type: ${ext}` }, { status: 400 });
  }

  await setStage(jobId, "uploading");

  // Save to temp uploads dir first
  const tmpDir = jobDir(jobId);
  const tmpPath = path.join(tmpDir, `original${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(tmpPath, buffer);

  // Probe to detect format — portrait or under 3 min = short form, 5+ min landscape = long form
  const meta = await probe(tmpPath);
  const isPortrait = meta.height > meta.width;
  const isShortForm =
    isPortrait || meta.durationSec < 180 || (meta.durationSec < 300 && isPortrait);
  const format = isShortForm ? SHORT_FORM_DIR : LONG_FORM_DIR;
  const title = path.basename(file.name, ext);

  // Create content folder
  const contentDir = path.join(contentRoot(), format, title);
  await ensureDir(contentDir);

  // Move file to content folder
  const filename = `original${ext}`;
  const destPath = path.join(contentDir, filename);
  await fs.rename(tmpPath, destPath).catch(async () => {
    await fs.copyFile(tmpPath, destPath);
    await fs.unlink(tmpPath);
  });

  // Move job.json to content folder, clean up uploads dir
  const oldJobJson = path.join(tmpDir, "job.json");
  const newJobJson = path.join(contentDir, "job.json");
  await fs.rename(oldJobJson, newJobJson).catch(() => {});
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

  // Persist content folder to index so it survives server restarts
  await setJobFolder(jobId, contentDir);

  await updateJob(jobId, {
    stage: "uploaded",
    contentFolder: contentDir,
    originalVideoPath: filename,
    originalVideoName: file.name,
    videoDurationSec: meta.durationSec,
    videoWidth: meta.width,
    videoHeight: meta.height,
  });

  return NextResponse.json({
    jobId,
    filename,
    format,
    title,
    contentFolder: contentDir,
    durationSec: meta.durationSec,
    width: meta.width,
    height: meta.height,
  });
}
