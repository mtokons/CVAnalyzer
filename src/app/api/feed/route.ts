import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export const runtime = "nodejs";

const MAX_IMG = 400 * 1024; // ~400KB cap on stored data URL

function badImage(data: unknown): data is string {
  return typeof data === "string" && data.length > 0 && (!data.startsWith("data:image/") || data.length > MAX_IMG);
}

// GET /api/feed — recent posts with comments
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, image: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });
  return NextResponse.json({ posts });
}

// POST /api/feed — create a post (text + optional compressed image)
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text = (body.text || "").toString().trim().slice(0, 5000);
  const imageData = body.imageData ? String(body.imageData) : null;
  if (!text && !imageData) return NextResponse.json({ error: "Empty post" }, { status: 400 });
  if (imageData && badImage(imageData)) return NextResponse.json({ error: "Image too large" }, { status: 400 });

  const post = await prisma.post.create({
    data: { userId, text, imageData },
    include: { user: { select: { id: true, name: true, image: true } }, comments: true },
  });
  return NextResponse.json(post, { status: 201 });
}
