import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectManager } from "@/lib/pm-guard";
import { nextProjectSerial } from "@/lib/serials";

export const runtime = "nodejs";

// GET /api/pm/projects — list projects
export async function GET() {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { candidates: true } } },
  });
  return NextResponse.json({ projects });
}

// POST /api/pm/projects — create a project
export async function POST(req: NextRequest) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  if (!b.name || typeof b.name !== "string") {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      serial: await nextProjectSerial(),
      name: b.name.trim(),
      partnerType: b.partnerType === "DIRECT" ? "DIRECT" : "INDIRECT",
      partnerName: b.partnerName || null,
      country: b.country || null,
      description: b.description || null,
      requirements: b.requirements || null,
      ratingGuide: b.ratingGuide || null,
      currency: b.currency || "EUR",
      deadline: b.deadline ? new Date(b.deadline) : null,
      ownerId: actor.id,
    },
  });
  return NextResponse.json({ project }, { status: 201 });
}
