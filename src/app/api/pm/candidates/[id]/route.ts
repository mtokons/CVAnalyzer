import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectManager } from "@/lib/pm-guard";

export const runtime = "nodejs";

// PATCH /api/pm/candidates/[id] — update candidate (rating, category, rate, CV)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));

  const candidate = await prisma.candidate.update({
    where: { id },
    data: {
      ...(b.fullName ? { fullName: b.fullName } : {}),
      ...(b.email !== undefined ? { email: b.email } : {}),
      ...(b.phone !== undefined ? { phone: b.phone } : {}),
      ...(b.country !== undefined ? { country: b.country } : {}),
      ...(b.profession !== undefined ? { profession: b.profession } : {}),
      ...(b.category !== undefined ? { category: b.category } : {}),
      ...(b.rating !== undefined ? { rating: b.rating } : {}),
      ...(b.source ? { source: b.source } : {}),
      ...(b.rateAmount !== undefined ? { rateAmount: b.rateAmount } : {}),
      ...(b.rateCurrency ? { rateCurrency: b.rateCurrency } : {}),
      ...(b.cvFormat !== undefined ? { cvFormat: b.cvFormat } : {}),
      ...(b.standardCvUrl !== undefined ? { standardCvUrl: b.standardCvUrl } : {}),
      ...(b.notes !== undefined ? { notes: b.notes } : {}),
    },
  });
  return NextResponse.json({ candidate });
}

// DELETE /api/pm/candidates/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.candidate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
