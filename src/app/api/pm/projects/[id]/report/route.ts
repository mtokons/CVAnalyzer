import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectManager } from "@/lib/pm-guard";

export const runtime = "nodejs";

// POST /api/pm/projects/[id]/report — snapshot candidates + rates as a report
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));

  const project = await prisma.project.findUnique({
    where: { id },
    include: { candidates: { include: { candidate: true } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = project.candidates.map((pc) => ({
    serial: pc.candidate.serial,
    name: pc.candidate.fullName,
    profession: pc.candidate.profession,
    country: pc.candidate.country,
    category: pc.candidate.category,
    rating: pc.candidate.rating,
    expertRateEur: pc.expertRateEur,
    partnerRateEur: pc.partnerRateEur,
    marginEur: pc.marginEur,
    status: pc.status,
  }));
  const totals = rows.reduce(
    (a, r) => { a.cost += r.expertRateEur ?? 0; a.bill += r.partnerRateEur ?? 0; a.margin += r.marginEur ?? 0; return a; },
    { cost: 0, bill: 0, margin: 0 }
  );

  const report = await prisma.projectReport.create({
    data: {
      projectId: id,
      title: b.title || `${project.name} — Quote Report`,
      summary: b.summary || `${rows.length} experts · EUR ${totals.bill.toFixed(0)} bill`,
      payload: { rows, totals, currency: "EUR" },
    },
  });
  return NextResponse.json({ report }, { status: 201 });
}

// GET /api/pm/projects/[id]/report — list reports
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const reports = await prisma.projectReport.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ reports });
}
