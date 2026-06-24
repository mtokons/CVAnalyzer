import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { gmailConfigured } from "@/lib/gmail";

export const runtime = "nodejs";

// GET /api/gmail/status — whether Gmail is connected for this user
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const acct = await prisma.gmailAccount.findUnique({
    where: { userId },
    select: { email: true, lastSyncedAt: true },
  });

  return NextResponse.json({
    configured: gmailConfigured(),
    connected: Boolean(acct),
    email: acct?.email ?? null,
    lastSyncedAt: acct?.lastSyncedAt ?? null,
  });
}

// DELETE /api/gmail/status — disconnect Gmail
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.gmailAccount.deleteMany({ where: { userId } });
  return NextResponse.json({ success: true });
}
