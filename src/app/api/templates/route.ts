import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { TEMPLATE_LIST, recommendTemplatesForRole, DEFAULT_TEMPLATE_ID, GERMAN_CV_TEMPLATES } from "@/lib/cv-templates";

export const runtime = "nodejs";

// GET /api/templates — list all CV templates + recommendations for this user
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Derive a role hint from the user's most recent experience title.
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { experience: true, preferredTemplate: true },
  });

  let roleHint = "";
  const experience = (profile?.experience as unknown as Array<{ title?: string }> | null) ?? [];
  if (Array.isArray(experience) && experience.length > 0) {
    roleHint = experience[0]?.title ?? "";
  }

  const recommended = recommendTemplatesForRole(roleHint);

  return NextResponse.json({
    templates: TEMPLATE_LIST,
    recommended,
    roleHint,
    preferred: profile?.preferredTemplate ?? DEFAULT_TEMPLATE_ID,
    defaultTemplate: DEFAULT_TEMPLATE_ID,
  });
}

// PATCH /api/templates — save the user's preferred template
export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const template = (body.template ?? body.templateId) as string | undefined;
  if (!template || !GERMAN_CV_TEMPLATES.some((t) => t.id === template)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, preferredTemplate: template },
    update: { preferredTemplate: template },
  });

  return NextResponse.json({ success: true, preferred: template });
}

