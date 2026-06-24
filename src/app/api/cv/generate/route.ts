import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import {
  aiService,
  type WorkExperience,
  type Education,
  type Certification,
  type Language,
  type Project,
} from "@/services/ai.service";

export const maxDuration = 120;

// POST /api/cv/generate — generate a tailored CV for a job
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { jobId, template = "modern" } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Fetch profile and job in parallel
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
      phone: profile.phone ?? undefined,
      location: profile.location ?? undefined,
      website: profile.website ?? undefined,
      linkedin: profile.linkedin ?? undefined,
      github: profile.github ?? undefined,
      summary: profile.summary ?? undefined,
      experience: profile.experience as unknown as WorkExperience[],
      education: profile.education as unknown as Education[],
      skills: profile.skills as unknown as string[],
      certifications: profile.certifications as unknown as Certification[],
      languages: profile.languages as unknown as Language[],
      projects: profile.projects as unknown as Project[],
    };

    const jobDetails = {
      title: job.title,
      company: job.company,
      location: job.location ?? undefined,
      description: job.description,
      requirements: job.requirements as unknown as string[],
      keywords: job.keywords as unknown as string[],
    };

    const result = await aiService.generateTailoredCV(profileData, jobDetails, {
      matchedSkills: job.matchedSkills as unknown as string[],
      missingSkills: job.missingSkills as unknown as string[],
      keywords: job.keywords as unknown as string[],
    }, template);

    // Save the generated CV
    const cvDoc = await prisma.cVDocument.create({
      data: {
        userId,
        jobId,
        title: `${job.title} at ${job.company}`,
        template,
        content: result.content as object,
        htmlContent: result.htmlContent,
        aiModel: aiService.modelName,
      },
    });

    // Update job ATS score
    await prisma.job.update({
      where: { id: jobId },
      data: {
        atsScore: result.atsScore,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
      },
    });

    return NextResponse.json({
      success: true,
      cvDocument: cvDoc,
      atsScore: result.atsScore,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      suggestions: result.suggestions,
    });
  } catch (error) {
    console.error("POST /api/cv/generate error:", error);
    return NextResponse.json({ error: "Failed to generate CV" }, { status: 500 });
  }
}

// GET /api/cv/generate — list all generated CVs
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const cvs = await prisma.cVDocument.findMany({
      where: { userId },
      include: { job: { select: { title: true, company: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(cvs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch CVs" }, { status: 500 });
  }
}
