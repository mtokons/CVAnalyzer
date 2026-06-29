import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export const runtime = "nodejs";

// Fields a user may choose to keep private. Anything not listed is always public.
const ALLOWED_PRIVATE = [
  "email",
  "phone",
  "location",
  "website",
  "linkedin",
  "github",
  "experience",
  "education",
  "certifications",
  "awards",
  "publications",
];

// PATCH /api/profile/visibility — set isPublic + privateFields for own profile
export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const isPublic = typeof body.isPublic === "boolean" ? body.isPublic : true;
  const privateFields = Array.isArray(body.privateFields)
    ? body.privateFields.filter((f: unknown): f is string => typeof f === "string" && ALLOWED_PRIVATE.includes(f))
    : [];

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: { isPublic, privateFields },
    create: { user: { connect: { id: userId } }, isPublic, privateFields },
    select: { isPublic: true, privateFields: true },
  });

  return NextResponse.json(profile);
}
