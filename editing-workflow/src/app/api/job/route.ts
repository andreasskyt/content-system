import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { initJob } from "@/lib/jobStore";

export async function POST() {
  const id = randomUUID();
  const job = await initJob(id);
  return NextResponse.json({ jobId: id, job });
}
