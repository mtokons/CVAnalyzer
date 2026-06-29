import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export const runtime = "nodejs";

// GET /api/users — directory of users with public profiles (public info only)
export async function GET() {
  const viewerId = await getUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { profile: { isPublic: true } },
    select: {
      id: true,
      name: true,
      image: true,
      profile: { select: { fullName: true, location: true, summary: true, privateFields: true } },
    },
    orderBy: { name: "asc" },
    take: 100,
  });

  const out = users.map((u) => {
    const pf = (u.profile?.privateFields as string[]) || [];
    return {
      id: u.id,
      name: u.profile?.fullName || u.name,
      image: u.image,
      location: pf.includes("location") ? null : u.profile?.location || null,
      summary: u.profile?.summary || null,
    };
  });

  return NextResponse.json({ users: out });
}
