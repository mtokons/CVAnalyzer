import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jobScraper } from "@/services/job-scraper.service";
import { aiService, type WorkExperience } from "@/services/ai.service";

export const maxDuration = 60;

// GET /api/jobs — list all saved jobs
export async function GET(req: NextRequest) {
  try {
    const userId = "demo-user";
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const jobs = await prisma.job.findMany({
      where: {
        userId,
        ...(status ? { status: status as "SAVED" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED" | "WITHDRAWN" } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        cvDocuments: { where: { isActive: true }, take: 1 },
        coverLetters: { where: { isActive: true }, take: 1 },
        application: true,
      },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("GET /api/jobs error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

// POST /api/jobs — add a new job (from URL or manual text)
export async function POST(req: NextRequest) {
  try {
    const userId = "demo-user";
    const body = await req.json();
    const { url, text, manual } = body;

    let jobData;

    if (url) {
      // Validate URL
      try { new URL(url); } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
      jobData = await jobScraper.scrapeJobFromURL(url);
    } else if (text) {
      jobData = await jobScraper.parseJobDescription(text);
    } else if (manual) {
      // Direct manual entry
      jobData = {
        title: manual.title,
        company: manual.company,
        location: manual.location || "",
        jobType: manual.jobType || "",
        salary: manual.salary || "",
        description: manual.description || "",
        requirements: manual.requirements || [],
        keywords: manual.keywords || [],
        niceToHave: manual.niceToHave || [],
        portalName: manual.portalName || "Manual",
        portalUrl: manual.portalUrl || "",
        applicationUrl: manual.applicationUrl || "",
        rawText: manual.description || "",
      };
    } else {
      return NextResponse.json({ error: "Provide url, text, or manual job data" }, { status: 400 });
    }

    // Get user profile for ATS scoring
    const profile = await prisma.profile.findUnique({ where: { userId } });
    let atsScore = 0;
    let matchedSkills: string[] = [];
    let missingSkills: string[] = [];

    if (profile) {
      const atsResult = await aiService.calculateATSScore(
        {
          skills: profile.skills as unknown as string[],
          experience: profile.experience as unknown as WorkExperience[],
        },
        {
          title: jobData.title,
          company: jobData.company,
          description: jobData.description,
          requirements: jobData.requirements,
          keywords: jobData.keywords,
        }
      );
      atsScore = atsResult.score;
      matchedSkills = atsResult.matchedSkills;
      missingSkills = atsResult.missingSkills;
    }

    const job = await prisma.job.create({
      data: {
        user: { connect: { id: userId } },
        title: jobData.title || "Untitled Position",
        company: jobData.company || "Unknown Company",
        location: jobData.location,
        jobType: jobData.jobType,
        salary: jobData.salary,
        description: jobData.description,
        requirements: jobData.requirements,
        keywords: jobData.keywords,
        portalUrl: jobData.portalUrl,
        portalName: jobData.portalName,
        applicationUrl: jobData.applicationUrl,
        atsScore,
        matchedSkills,
        missingSkills,
      },
    });

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error) {
    console.error("POST /api/jobs error:", error);
    return NextResponse.json({ error: "Failed to add job" }, { status: 500 });
  }
}
