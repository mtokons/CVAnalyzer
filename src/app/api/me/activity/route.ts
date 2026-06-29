import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export const runtime = "nodejs";

const PAGE_SIZE = 25;

// GET /api/me/activity — the signed-in user's own activity log only.
//   ?action=  exact action  ?category=  ?status=  ?page=
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const action = (searchParams.get("action") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const where: Prisma.ActivityLogWhereInput = { userId };
  if (action) where.action = action;
  if (category) where.category = category;
  if (status) where.status = status;

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        category: true,
        status: true,
        message: true,
        ipAddress: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    logs,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
