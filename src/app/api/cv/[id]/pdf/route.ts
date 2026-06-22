import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { generateCVPDF } from "@/services/pdf.service";
import type { ProfileData } from "@/services/ai.service";

export const runtime = "nodejs";

// GET /api/cv/[id]/pdf — download a generated CV as a PDF
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const cv = await prisma.cVDocument.findFirst({ where: { id, userId } });
    if (!cv) return NextResponse.json({ error: "CV not found" }, { status: 404 });

    const pdf = await generateCVPDF(cv.content as ProfileData);
    const filename = `${cv.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.length),
      },
    });
  } catch (error) {
    console.error("GET /api/cv/[id]/pdf error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
