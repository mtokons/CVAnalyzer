import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, getUserRole } from "@/lib/session";

export const runtime = "nodejs";

// GET /api/users/[id] — another user's PUBLIC profile info only.
// Owner sees own full profile; admins can view all; others see public fields,
// minus any the owner marked private. Private profiles are hidden from others.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewerId = await getUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRole();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isSelf = viewerId === id;

  const profile = await prisma.profile.findUnique({
    where: { userId: id },
    include: { user: { select: { name: true, image: true } } },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!profile.isPublic && !isSelf && !isAdmin) {
    return NextResponse.json({ error: "Profile is private" }, { status: 403 });
  }

  const showAll = isSelf || isAdmin;
  const hidden = new Set((profile.privateFields as string[]) || []);
  const pick = (key: string, value: unknown) => (showAll || !hidden.has(key) ? value : null);

  return NextResponse.json({
    id,
    name: profile.fullName || profile.user.name,
    image: profile.user.image,
    summary: profile.summary,
    skills: profile.skills,
    location: pick("location", profile.location),
    email: pick("email", profile.email),
    phone: pick("phone", profile.phone),
    website: pick("website", profile.website),
    linkedin: pick("linkedin", profile.linkedin),
    github: pick("github", profile.github),
    experience: pick("experience", profile.experience),
    education: pick("education", profile.education),
    certifications: pick("certifications", profile.certifications),
    awards: pick("awards", profile.awards),
    publications: pick("publications", profile.publications),
  });
}
