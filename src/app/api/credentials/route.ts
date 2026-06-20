import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const credentialSchema = z.object({
  portalName: z.string().min(1).max(100),
  portalUrl: z.string().url(),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
});

// GET /api/credentials — list stored portal credentials (names only, no passwords)
export async function GET(req: NextRequest) {
  try {
    const userId = "demo-user";
    const creds = await prisma.portalCredential.findMany({
      where: { userId },
      select: { id: true, portalName: true, portalUrl: true, username: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(creds);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch credentials" }, { status: 500 });
  }
}

// POST /api/credentials — store portal credentials (encrypted)
export async function POST(req: NextRequest) {
  try {
    const userId = "demo-user";
    const body = await req.json();

    const parsed = credentialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { portalName, portalUrl, username, password } = parsed.data;
    const encryptedPassword = encrypt(password);

    const credential = await prisma.portalCredential.upsert({
      where: { userId_portalName: { userId, portalName } },
      create: { userId, portalName, portalUrl, username, password: encryptedPassword },
      update: { portalUrl, username, password: encryptedPassword },
      select: { id: true, portalName: true, portalUrl: true, username: true, createdAt: true },
    });

    return NextResponse.json({ success: true, credential });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}

// DELETE /api/credentials/[id]
export async function DELETE(req: NextRequest) {
  try {
    const userId = "demo-user";
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.portalCredential.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete credential" }, { status: 500 });
  }
}
