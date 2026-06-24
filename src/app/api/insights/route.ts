import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import type { ProfileData } from "@/services/ai.service";
import {
  computeProfileScore,
  computeApplicationFunnel,
  computeRoleFit,
  type FunnelJob,
} from "@/lib/insights";

export const runtime = "nodejs";

// GET /api/insights — career intelligence: profile score, application funnel,
// role fit, and headline counts. All derived live from existing data.
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profileRow, jobs, cvCount, coverCount, emailCount] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.job.findMany({
        where: { userId },
        select: { status: true, atsScore: true, appliedAt: true, createdAt: true },
      }),
      prisma.cVDocument.count({ where: { userId } }),
      prisma.coverLetter.count({ where: { userId } }),
      prisma.emailMessage.count({ where: { userId, isFromEmployer: true } }),
    ]);

    // Prisma JSON columns → typed ProfileData (safe unknown cast).
    const profile: ProfileData = profileRow
      ? {
          fullName: profileRow.fullName ?? undefined,
          email: profileRow.email ?? undefined,
          phone: profileRow.phone ?? undefined,
          location: profileRow.location ?? undefined,
          website: profileRow.website ?? undefined,
          linkedin: profileRow.linkedin ?? undefined,
          github: profileRow.github ?? undefined,
          summary: profileRow.summary ?? undefined,
          experience: (profileRow.experience as unknown as ProfileData["experience"]) ?? [],
          education: (profileRow.education as unknown as ProfileData["education"]) ?? [],
          skills: (profileRow.skills as unknown as string[]) ?? [],
          certifications: (profileRow.certifications as unknown as ProfileData["certifications"]) ?? [],
          languages: (profileRow.languages as unknown as ProfileData["languages"]) ?? [],
          projects: (profileRow.projects as unknown as ProfileData["projects"]) ?? [],
        }
      : {};

    const profileScore = computeProfileScore(profile);
    const funnel = computeApplicationFunnel(jobs as unknown as FunnelJob[]);
    const roleFit = computeRoleFit(profile);

    return NextResponse.json({
      profileScore,
      funnel,
      roleFit,
      counts: {
        cvs: cvCount,
        coverLetters: coverCount,
        employerEmails: emailCount,
      },
    });
  } catch (error) {
    console.error("GET /api/insights error:", error);
    return NextResponse.json({ error: "Failed to load insights" }, { status: 500 });
  }
}
