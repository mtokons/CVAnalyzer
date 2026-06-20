import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SourceType } from "@prisma/client";
import { documentParser } from "@/services/document-parser.service";
import { aiService, type WorkExperience, type Education } from "@/services/ai.service";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/profile/upload — upload and parse a document (PDF, DOCX, TXT)
export async function POST(req: NextRequest) {
  try {
    const userId = "demo-user";
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum 10MB allowed." }, { status: 400 });
    }

    // Validate MIME type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload PDF, DOCX, or TXT files." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Best-effort persistence of the original file. On serverless/Cloud Run the
    // app filesystem is read-only (only /tmp is writable), so this is wrapped in
    // try/catch and never blocks parsing — the parser works directly from the
    // in-memory buffer. Set UPLOAD_DIR=/tmp/uploads on such hosts to keep copies.
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    let fileUrl: string | null = null;
    try {
      const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      await writeFile(join(uploadDir, safeFileName), buffer);
      fileUrl = `/uploads/${safeFileName}`;
    } catch (err) {
      console.warn(
        "Upload file persistence skipped (read-only filesystem):",
        err instanceof Error ? err.message : err
      );
    }

    // Parse the document
    const parseResult = await documentParser.parseFile(buffer, file.name, file.type);

    // Get existing profile and merge
    const existingProfile = await prisma.profile.findUnique({ where: { userId } });

    const sourceTypeMap: Record<string, SourceType> = {
      "application/pdf": SourceType.PDF_UPLOAD,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": SourceType.WORD_UPLOAD,
      "text/plain": SourceType.TEXT_UPLOAD,
    };
    const sourceType = sourceTypeMap[file.type] || SourceType.PDF_UPLOAD;

    if (existingProfile) {
      const existingData = {
        fullName: existingProfile.fullName ?? undefined,
        email: existingProfile.email ?? undefined,
        experience: existingProfile.experience as unknown as WorkExperience[],
        education: existingProfile.education as unknown as Education[],
        skills: existingProfile.skills as unknown as string[],
      };

      const merged = await aiService.mergeProfileSources([existingData, parseResult.parsedProfile]);

      await prisma.profile.update({
        where: { userId },
        data: {
          fullName: merged.fullName,
          email: merged.email,
          phone: merged.phone,
          location: merged.location,
          website: merged.website,
          linkedin: merged.linkedin,
          github: merged.github,
          summary: merged.summary,
          experience: (merged.experience as object[]) ?? [],
          education: (merged.education as object[]) ?? [],
          skills: (merged.skills as string[]) ?? [],
          certifications: (merged.certifications as object[]) ?? [],
          languages: (merged.languages as object[]) ?? [],
          projects: (merged.projects as object[]) ?? [],
          sources: {
            create: {
              sourceType,
              sourceName: file.name,
              rawContent: parseResult.rawText.slice(0, 10000),
              parsedData: parseResult.parsedProfile as object,
              fileUrl,
              status: "COMPLETED",
            },
          },
        },
      });
    } else {
      await prisma.profile.create({
        data: {
          user: {
            connectOrCreate: {
              where: { id: userId },
              create: {
                id: userId,
                email: parseResult.parsedProfile.email || "demo@example.com",
              },
            },
          },
          fullName: parseResult.parsedProfile.fullName,
          email: parseResult.parsedProfile.email,
          phone: parseResult.parsedProfile.phone,
          location: parseResult.parsedProfile.location,
          website: parseResult.parsedProfile.website,
          linkedin: parseResult.parsedProfile.linkedin,
          github: parseResult.parsedProfile.github,
          summary: parseResult.parsedProfile.summary,
          experience: (parseResult.parsedProfile.experience as object[]) ?? [],
          education: (parseResult.parsedProfile.education as object[]) ?? [],
          skills: (parseResult.parsedProfile.skills as string[]) ?? [],
          certifications: (parseResult.parsedProfile.certifications as object[]) ?? [],
          languages: (parseResult.parsedProfile.languages as object[]) ?? [],
          projects: (parseResult.parsedProfile.projects as object[]) ?? [],
          sources: {
            create: {
              sourceType,
              sourceName: file.name,
              rawContent: parseResult.rawText.slice(0, 10000),
              parsedData: parseResult.parsedProfile as object,
              fileUrl,
              status: "COMPLETED",
            },
          },
        },
      });
    }

    const updated = await prisma.profile.findUnique({
      where: { userId },
      include: { sources: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      profile: updated,
      extractedData: parseResult.parsedProfile,
    });
  } catch (error) {
    console.error("POST /api/profile/upload error:", error);
    return NextResponse.json({ error: "Failed to process uploaded file" }, { status: 500 });
  }
}
