import fs from "fs/promises";
import path from "path";
import { PipelineJob, PipelineStage } from "./types";

// ── Paths ─────────────────────────────────────────────────────────────────────

const CONTENT_ROOT =
  process.env.CONTENT_BASE ?? "[CONTENT_ROOT]";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

// Job dirs can live in Content/ or uploads/ — we check the job record first
export function jobDir(jobId: string): string {
  const cached = jobs.get(jobId);
  if (cached?.contentFolder) return cached.contentFolder;
  return path.join(UPLOADS_ROOT, jobId);
}

export function jobFilePath(jobId: string): string {
  return path.join(jobDir(jobId), "job.json");
}

export function contentRoot(): string {
  return CONTENT_ROOT;
}

// ── Hot cache ─────────────────────────────────────────────────────────────────

const jobs = new Map<string, PipelineJob>();

// ── Job index (survives server restarts) ─────────────────────────────────────

const INDEX_PATH = path.join(process.cwd(), "job-index.json");

async function loadIndex(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(INDEX_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function saveIndex(index: Record<string, string>): Promise<void> {
  await fs.writeFile(INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
}

export async function setJobFolder(jobId: string, folder: string): Promise<void> {
  const index = await loadIndex();
  index[jobId] = folder;
  await saveIndex(index);
}

async function getJobFolder(jobId: string): Promise<string | null> {
  const index = await loadIndex();
  return index[jobId] ?? null;
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getJob(id: string): Promise<PipelineJob | null> {
  if (jobs.has(id)) return jobs.get(id)!;

  // Try uploads dir first (legacy/init), then check index for content folder
  const uploadsPath = path.join(UPLOADS_ROOT, id, "job.json");
  const indexFolder = await getJobFolder(id);

  for (const candidate of [
    uploadsPath,
    indexFolder ? path.join(indexFolder, "job.json") : null,
  ]) {
    if (!candidate) continue;
    try {
      const raw = await fs.readFile(candidate, "utf8");
      const job = JSON.parse(raw) as PipelineJob;
      jobs.set(id, job);
      return job;
    } catch {
      continue;
    }
  }

  return null;
}

// ── Write ─────────────────────────────────────────────────────────────────────

async function persist(job: PipelineJob): Promise<void> {
  fs.writeFile(jobFilePath(job.id), JSON.stringify(job, null, 2), "utf8").catch(
    (err) => console.error(`[jobStore] persist error ${job.id}:`, err)
  );
}

export async function setJob(job: PipelineJob): Promise<void> {
  jobs.set(job.id, job);
  await persist(job);
}

export async function updateJob(
  id: string,
  update: Partial<PipelineJob>
): Promise<PipelineJob> {
  const existing = await getJob(id);
  if (!existing) throw new Error(`Job not found: ${id}`);

  const updated: PipelineJob = {
    ...existing,
    ...update,
    id,
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, updated);
  persist(updated);
  return updated;
}

export async function setStage(
  id: string,
  stage: PipelineStage,
  extra?: Partial<PipelineJob>
): Promise<PipelineJob> {
  return updateJob(id, { stage, stageProgress: 0, ...extra });
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initJob(id: string): Promise<PipelineJob> {
  await fs.mkdir(jobDir(id), { recursive: true });
  const now = new Date().toISOString();
  const job: PipelineJob = { id, createdAt: now, updatedAt: now, stage: "idle" };
  await setJob(job);
  return job;
}
