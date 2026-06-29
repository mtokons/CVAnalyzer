import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, getUserRole } from "@/lib/session";

export const runtime = "nodejs";

const MAX_IMG = 400 * 1024;

// DELETE /api/feed/[id] — delete own post (or admin)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await getUserRole();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const post = await prisma.post.findUnique({ where: { id }, select: { userId: true } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.userId !== userId && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// POST /api/feed/[id] — add a comment to a post
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text = (body.text || "").toString().trim().slice(0, 2000);
  const imageData = body.imageData ? String(body.imageData) : null;
  if (!text && !imageData) return NextResponse.json({ error: "Empty comment" }, { status: 400 });
  if (imageData && (!imageData.startsWith("data:image/") || imageData.length > MAX_IMG))
    return NextResponse.json({ error: "Image too large" }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.postComment.create({
    data: { postId: id, userId, text, imageData },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json(comment, { status: 201 });
}
