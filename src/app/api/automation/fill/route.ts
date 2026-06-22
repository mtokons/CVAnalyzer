import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { portalAutomation } from "@/services/portal-automation.service";
import { encrypt, decrypt } from "@/lib/encryption";

export const maxDuration = 300; // 5 minutes for automation

// POST /api/automation/fill — auto-fill a job application form
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { jobId, portalCredentialId, useStoredCredentials = false } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Fetch job, profile, and latest CV/cover letter in parallel
    const [job, profile, latestCV, latestCoverLetter] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobId } }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.cVDocument.findFirst({
        where: { jobId, userId, isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.coverLetter.findFirst({
        where: { jobId, userId, isActive: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!profile) return NextResponse.json({ error: "No profile found" }, { status: 400 });

    const applicationUrl = job.applicationUrl || job.portalUrl;
    if (!applicationUrl) {
      return NextResponse.json(
        { error: "No application URL found for this job" },
        { status: 400 }
      );
    }

    // Get portal credentials if requested
    let credentials: { username: string; password: string } | undefined;
    if (useStoredCredentials && portalCredentialId) {
      const cred = await prisma.portalCredential.findFirst({
        where: { id: portalCredentialId, userId },
      });
      if (cred) {
        credentials = {
          username: cred.username,
          password: decrypt(cred.password),
        };
      }
    }

    // Build form data from profile
    const nameParts = (profile.fullName || "").split(" ");
    const formData = {
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: profile.email || "",
      phone: profile.phone || "",
      location: profile.location || "",
      linkedinUrl: profile.linkedin || "",
      websiteUrl: profile.website || "",
      currentTitle: (profile.experience as unknown as Array<{ title: string }>)?.[0]?.title || "",
      currentCompany: (profile.experience as unknown as Array<{ company: string }>)?.[0]?.company || "",
      coverLetterText: latestCoverLetter
        ? latestCoverLetter.content.replace(/<[^>]+>/g, "") // strip HTML tags
        : undefined,
    };

    // Create/update application record
    const application = await prisma.application.upsert({
      where: { jobId },
      create: {
        userId,
        jobId,
        formData: formData as object,
        fillStatus: "FILLING",
      },
      update: {
        formData: formData as object,
        fillStatus: "FILLING",
      },
    });

    // Run automation
    const result = await portalAutomation.fillApplicationForm(
      applicationUrl,
      formData,
      credentials
    );

    // Update application with results
    await prisma.application.update({
      where: { id: application.id },
      data: {
        fillStatus: result.status === "completed" ? "AWAITING_REVIEW" : "FAILED",
        fillLog: result.steps as object[],
        screenshotUrl: result.screenshotBase64
          ? `data:image/png;base64,${result.screenshotBase64}`
          : null,
      },
    });

    // Update job status
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "APPLIED", appliedAt: new Date() },
    });

    return NextResponse.json({
      success: result.status === "completed",
      applicationId: application.id,
      filledFields: result.filledFields,
      totalFields: result.totalFields,
      requiresVerification: result.requiresVerification,
      message: result.message,
      steps: result.steps,
    });
  } catch (error) {
    console.error("POST /api/automation/fill error:", error);
    return NextResponse.json({ error: "Automation failed" }, { status: 500 });
  }
}
