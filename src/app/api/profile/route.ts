import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SourceType } from "@prisma/client";
import { documentParser } from "@/services/document-parser.service";
import { aiService, type WorkExperience, type Education } from "@/services/ai.service";

// GET /api/profile — get the user's aggregated profile
export async function GET() {
  try {
    // TODO: Replace "demo-user" with actual session user ID once auth is configured
    const userId = "demo-user";

    let profile = await prisma.profile.findUnique({
      where: { userId },
      include: { sources: true },
    });

    if (!profile) {
      // Auto-create a blank profile for new users
      profile = await prisma.profile.create({
        data: {
          user: {
            connectOrCreate: {
              where: { id: userId },
              create: { id: userId, email: "demo@example.com", name: "Demo User" },
            },
          },
        },
        include: { sources: true },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// PUT /api/profile — update profile fields manually
export async function PUT(req: NextRequest) {
  try {
    const userId = "demo-user";
    const body = await req.json();

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        location: body.location,
        website: body.website,
        linkedin: body.linkedin,
        github: body.github,
        summary: body.summary,
        experience: body.experience ?? [],
        education: body.education ?? [],
        skills: body.skills ?? [],
        certifications: body.certifications ?? [],
        languages: body.languages ?? [],
        projects: body.projects ?? [],
        awards: body.awards ?? [],
        publications: body.publications ?? [],
      },
      create: {
        user: {
          connectOrCreate: {
            where: { id: userId },
            create: { id: userId, email: body.email || "demo@example.com", name: body.fullName || "Demo User" },
          },
        },
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        location: body.location,
        website: body.website,
        linkedin: body.linkedin,
        github: body.github,
        summary: body.summary,
        experience: body.experience ?? [],
        education: body.education ?? [],
        skills: body.skills ?? [],
        certifications: body.certifications ?? [],
        languages: body.languages ?? [],
        projects: body.projects ?? [],
        awards: body.awards ?? [],
        publications: body.publications ?? [],
      },
      include: { sources: true },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("PUT /api/profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

// POST /api/profile — import from URL (LinkedIn, Monster, etc.)
export async function POST(req: NextRequest) {
  try {
    const userId = "demo-user";
    const body = await req.json();
    const { url } = body;
    const sourceType: SourceType = Object.values(SourceType).includes(body.sourceType)
      ? (body.sourceType as SourceType)
      : SourceType.URL;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Scrape and parse the profile
    const parseResult = await documentParser.parseFromURL(url, "profile");

    // Get or create profile
    const existingProfile = await prisma.profile.findUnique({ where: { userId } });

    if (existingProfile) {
      // Merge with existing profile using AI
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
          awards: (merged.awards as object[]) ?? [],
          publications: (merged.publications as object[]) ?? [],
          sources: {
            create: {
              sourceType,
              sourceName: new URL(url).hostname,
              rawContent: parseResult.rawText,
              parsedData: parseResult.parsedProfile as object,
              fileUrl: url,
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
              create: { id: userId, email: parseResult.parsedProfile.email || "demo@example.com" },
            },
          },
          fullName: parseResult.parsedProfile.fullName,
          email: parseResult.parsedProfile.email,
          phone: parseResult.parsedProfile.phone,
          location: parseResult.parsedProfile.location,
          experience: (parseResult.parsedProfile.experience as object[]) ?? [],
          education: (parseResult.parsedProfile.education as object[]) ?? [],
          skills: (parseResult.parsedProfile.skills as string[]) ?? [],
          sources: {
            create: {
              sourceType,
              sourceName: new URL(url).hostname,
              rawContent: parseResult.rawText,
              parsedData: parseResult.parsedProfile as object,
              fileUrl: url,
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

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return NextResponse.json({ error: "Failed to import profile from URL" }, { status: 500 });
  }
}
