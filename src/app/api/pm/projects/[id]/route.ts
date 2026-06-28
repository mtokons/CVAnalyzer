import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectManager } from "@/lib/pm-guard";

export const runtime = "nodejs";

// GET /api/pm/projects/[id] — project with candidates + rates
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      candidates: { include: { candidate: true }, orderBy: { createdAt: "asc" } },
      reports: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, createdAt: true } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totals = project.candidates.reduce(
    (a, c) => {
      a.cost += c.expertRateEur ?? 0;
      a.bill += c.partnerRateEur ?? 0;
      a.margin += c.marginEur ?? 0;
      return a;
    },
    { cost: 0, bill: 0, margin: 0 }
  );
  return NextResponse.json({ project, totals });
}

// PATCH /api/pm/projects/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(b.name ? { name: b.name } : {}),
      ...(b.partnerType ? { partnerType: b.partnerType } : {}),
      ...(b.status ? { status: b.status } : {}),
      ...(b.partnerName !== undefined ? { partnerName: b.partnerName } : {}),
      ...(b.country !== undefined ? { country: b.country } : {}),
      ...(b.description !== undefined ? { description: b.description } : {}),
      ...(b.requirements !== undefined ? { requirements: b.requirements } : {}),
      ...(b.ratingGuide !== undefined ? { ratingGuide: b.ratingGuide } : {}),
      ...(b.deadline !== undefined ? { deadline: b.deadline ? new Date(b.deadline) : null } : {}),
    },
  });
  return NextResponse.json({ project });
}

// DELETE /api/pm/projects/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
