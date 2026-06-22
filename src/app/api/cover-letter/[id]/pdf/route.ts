import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { generateCoverLetterPDF } from "@/services/pdf.service";

export const runtime = "nodejs";

// GET /api/cover-letter/[id]/pdf — download a cover letter as a PDF
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const letter = await prisma.coverLetter.findFirst({ where: { id, userId } });
    if (!letter) return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { fullName: true },
    });

    const pdf = await generateCoverLetterPDF({
      content: letter.content,
      candidateName: profile?.fullName ?? undefined,
    });
    const filename = `${letter.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.length),
      },
    });
  } catch (error) {
    console.error("GET /api/cover-letter/[id]/pdf error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
