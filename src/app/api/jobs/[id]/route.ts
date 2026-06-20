import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/jobs/[id] — get single job
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        cvDocuments: { orderBy: { createdAt: "desc" } },
        coverLetters: { orderBy: { createdAt: "desc" } },
        application: true,
      },
    });

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

// PATCH /api/jobs/[id] — update job status/notes
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const job = await prisma.job.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes,
        appliedAt: body.status === "APPLIED" ? new Date() : undefined,
      },
    });
    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

// DELETE /api/jobs/[id] — delete job
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.job.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
