import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { aiService, type WorkExperience } from "@/services/ai.service";

export const maxDuration = 120;

// POST /api/cover-letter/generate
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { jobId, tone = "professional" } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const [profile, job] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.job.findUnique({ where: { id: jobId } }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "No profile found. Please add your profile first." }, { status: 400 });
    }
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const profileData = {
      fullName: profile.fullName ?? undefined,
      email: profile.email ?? undefined,
      summary: profile.summary ?? undefined,
      experience: profile.experience as unknown as WorkExperience[],
      skills: profile.skills as unknown as string[],
    };

    const jobDetails = {
      title: job.title,
      company: job.company,
      location: job.location ?? undefined,
      description: job.description,
      requirements: job.requirements as unknown as string[],
      keywords: job.keywords as unknown as string[],
    };

    const result = await aiService.generateCoverLetter(
      profileData,
      jobDetails,
      tone as "professional" | "enthusiastic" | "formal" | "creative"
    );

    const coverLetter = await prisma.coverLetter.create({
      data: {
        userId,
        jobId,
        title: `Cover Letter — ${job.title} at ${job.company}`,
        content: result.content,
        tone: result.tone,
        aiModel: aiService.modelName,
      },
    });

    return NextResponse.json({ success: true, coverLetter });
  } catch (error) {
    console.error("POST /api/cover-letter/generate error:", error);
    return NextResponse.json({ error: "Failed to generate cover letter" }, { status: 500 });
  }
}

// GET /api/cover-letter/generate — list all cover letters
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const letters = await prisma.coverLetter.findMany({
      where: { userId },
      include: { job: { select: { title: true, company: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(letters);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cover letters" }, { status: 500 });
  }
}
