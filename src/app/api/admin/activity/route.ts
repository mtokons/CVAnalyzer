import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/session";

export const runtime = "nodejs";

const PAGE_SIZE = 25;

// GET /api/admin/activity — paginated activity log with filter + search (admin only)
//   ?search=  text matches email / message / ip
//   ?action=  exact action (LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, ...)
//   ?category= AUTH | ACCOUNT | ERROR | ADMIN | SYSTEM
//   ?status=  SUCCESS | FAILURE
//   ?page=    1-based page number
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const search = (searchParams.get("search") || "").trim();
  const action = (searchParams.get("action") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const where: Prisma.ActivityLogWhereInput = {};
  if (action) where.action = action;
  if (category) where.category = category;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { message: { contains: search, mode: "insensitive" } },
      { ipAddress: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, logs, actionGroups] = await Promise.all([
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
        email: true,
        message: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.activityLog.groupBy({ by: ["action"], _count: { action: true } }),
  ]);

  return NextResponse.json({
    logs,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    actions: actionGroups
      .map((g) => ({ action: g.action, count: g._count.action }))
      .sort((a, b) => b.count - a.count),
  });
}
