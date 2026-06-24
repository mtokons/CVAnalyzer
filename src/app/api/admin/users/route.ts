import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/session";

export const runtime = "nodejs";

// GET /api/admin/users — list all users + platform stats (admin only)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, jobCount, cvCount, coverCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { jobs: true, cvDocuments: true, coverLetters: true } },
      },
    }),
    prisma.job.count(),
    prisma.cVDocument.count(),
    prisma.coverLetter.count(),
  ]);

  return NextResponse.json({
    stats: {
      users: users.length,
      jobs: jobCount,
      cvs: cvCount,
      coverLetters: coverCount,
    },
    users,
  });
}
