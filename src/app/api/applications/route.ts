import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export const runtime = "nodejs";

// GET /api/applications — all tracked applications with their email timeline
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.job.findMany({
    where: { userId, status: { in: ["APPLIED", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"] } },
    orderBy: [{ appliedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      status: true,
      appliedAt: true,
      updatedAt: true,
      emails: {
        orderBy: { receivedAt: "desc" },
        select: {
          id: true,
          subject: true,
          snippet: true,
          fromName: true,
          fromEmail: true,
          category: true,
          receivedAt: true,
        },
      },
    },
  });

  // Unmatched employer emails (couldn't be tied to a specific job).
  const unmatched = await prisma.emailMessage.findMany({
    where: { userId, jobId: null },
    orderBy: { receivedAt: "desc" },
    take: 20,
    select: {
      id: true,
      subject: true,
      snippet: true,
      fromName: true,
      fromEmail: true,
      category: true,
      receivedAt: true,
    },
  });

  return NextResponse.json({ applications: jobs, unmatched });
}
