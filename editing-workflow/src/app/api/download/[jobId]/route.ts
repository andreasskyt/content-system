import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getJob, jobDir } from "@/lib/jobStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const fileParam = req.nextUrl.searchParams.get("file");
  const relativePath = fileParam || job.outputVideoPath;
  if (!relativePath) {
    return NextResponse.json({ error: "No output video" }, { status: 404 });
  }

  const filePath = path.join(jobDir(jobId), relativePath);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const filename = path.basename(filePath);

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
