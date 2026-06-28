import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectManager } from "@/lib/pm-guard";
import { toEur } from "@/lib/fx";

export const runtime = "nodejs";

// POST /api/pm/projects/[id]/candidates — assign a candidate with dual rates.
// expertRate = what we pay the expert; partnerRate = what the partner pays us.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!b.candidateId) return NextResponse.json({ error: "candidateId required" }, { status: 400 });

  const expertRateEur = await toEur(b.expertRate, b.expertCurrency || "EUR");
  const partnerRateEur = await toEur(b.partnerRate, b.partnerCurrency || "EUR");
  const marginEur = (partnerRateEur ?? 0) - (expertRateEur ?? 0);

  const pc = await prisma.projectCandidate.upsert({
    where: { projectId_candidateId: { projectId: id, candidateId: b.candidateId } },
    update: {
      expertRate: b.expertRate ?? null,
      expertCurrency: b.expertCurrency || "EUR",
      partnerRate: b.partnerRate ?? null,
      partnerCurrency: b.partnerCurrency || "EUR",
      expertRateEur, partnerRateEur, marginEur,
      ...(b.status ? { status: b.status } : {}),
    },
    create: {
      projectId: id,
      candidateId: b.candidateId,
      expertRate: b.expertRate ?? null,
      expertCurrency: b.expertCurrency || "EUR",
      partnerRate: b.partnerRate ?? null,
      partnerCurrency: b.partnerCurrency || "EUR",
      expertRateEur, partnerRateEur, marginEur,
    },
  });
  return NextResponse.json({ projectCandidate: pc }, { status: 201 });
}

// DELETE /api/pm/projects/[id]/candidates?candidateId=...
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const candidateId = req.nextUrl.searchParams.get("candidateId");
  if (!candidateId) return NextResponse.json({ error: "candidateId required" }, { status: 400 });
  await prisma.projectCandidate.deleteMany({ where: { projectId: id, candidateId } });
  return NextResponse.json({ success: true });
}
