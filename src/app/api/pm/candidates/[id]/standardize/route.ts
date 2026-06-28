import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectManager } from "@/lib/pm-guard";
import { candidateFileName } from "@/lib/serials";

export const runtime = "nodejs";

// POST /api/pm/candidates/[id]/standardize
// Turns a candidate's basic info / raw CV text into a country/international
// standard CV (HTML) saved as a CVDocument, file named after the serial.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const format = b.format === "NATIONAL" ? "NATIONAL" : "INTERNATIONAL";

  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rawText =
    b.rawText ||
    `${candidate.fullName}\n${candidate.profession ?? ""}\n${candidate.country ?? ""}\n${candidate.notes ?? ""}`;

  let html = "";
  try {
    const { aiService } = await import("@/services/ai.service");
    const p = await aiService.extractProfileFromText(rawText, "TEXT_UPLOAD") as Record<string, unknown>;
    const exp = Array.isArray(p.experience) ? (p.experience as Record<string, unknown>[]) : [];
    html = `<section style="font-family:Arial;max-width:800px;margin:auto;padding:32px">` +
      `<h1 style="margin:0">${(p.fullName as string) || candidate.fullName}</h1>` +
      `<p style="color:#555">${(p.summary as string) || candidate.profession || ""}</p>` +
      `<h3>Experience</h3><ul>${exp.map((e) => `<li>${e.title ?? ""} — ${e.company ?? ""}</li>`).join("")}</ul>` +
      `<p style="color:#888">${format} standard · ${candidate.serial}</p></section>`;
  } catch {
    html = `<section style="font-family:Arial;padding:24px"><h1>${candidate.fullName}</h1>` +
      `<p>${candidate.profession ?? ""} — ${candidate.country ?? ""}</p>` +
      `<p>${candidate.notes ?? ""}</p><p style="color:#888">${format} standard · ${candidate.serial}</p></section>`;
  }

  const title = candidateFileName(candidate.serial, candidate.fullName, "cv");
  const doc = await prisma.cVDocument.create({
    data: {
      userId: actor.id,
      title,
      template: b.template || "berlin-modern",
      content: candidate.basicInfo ?? {},
      htmlContent: html,
      isActive: true,
    },
  });

  const updated = await prisma.candidate.update({
    where: { id },
    data: { standardCvId: doc.id, standardCvUrl: `/cv/${doc.id}`, cvFormat: format },
  });
  return NextResponse.json({ candidate: updated, cvDocumentId: doc.id });
}
