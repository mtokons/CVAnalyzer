import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectManager } from "@/lib/pm-guard";
import { nextCandidateSerial } from "@/lib/serials";

export const runtime = "nodejs";

// GET /api/pm/candidates — list candidates (optional ?source=ONLINE|OFFLINE)
export async function GET(req: NextRequest) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const source = req.nextUrl.searchParams.get("source");
  const candidates = await prisma.candidate.findMany({
    where: source === "ONLINE" || source === "OFFLINE" ? { source } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ candidates });
}

// POST /api/pm/candidates — create a candidate (auto serial)
export async function POST(req: NextRequest) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  if (!b.fullName) return NextResponse.json({ error: "Full name required" }, { status: 400 });

  const candidate = await prisma.candidate.create({
    data: {
      serial: await nextCandidateSerial(),
      fullName: b.fullName.trim(),
      email: b.email || null,
      phone: b.phone || null,
      country: b.country || null,
      nationality: b.nationality || null,
      profession: b.profession || null,
      category: b.category || null,
      rating: typeof b.rating === "number" ? b.rating : null,
      source: b.source === "OFFLINE" ? "OFFLINE" : "ONLINE",
      rateAmount: typeof b.rateAmount === "number" ? b.rateAmount : null,
      rateCurrency: b.rateCurrency || "EUR",
      rateUnit: b.rateUnit || "day",
      cvFormat: b.cvFormat || null,
      originalCvUrl: b.originalCvUrl || null,
      notes: b.notes || null,
      basicInfo: b.basicInfo || {},
    },
  });
  return NextResponse.json({ candidate }, { status: 201 });
}
