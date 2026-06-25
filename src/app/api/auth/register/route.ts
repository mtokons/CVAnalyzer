import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { logActivity, clientInfoFromHeaders } from "@/lib/activity";

// POST /api/auth/register — create a new account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name as string | undefined)?.trim();
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    const password = body.password as string | undefined;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name: name || null, passwordHash },
      select: { id: true, email: true, name: true },
    });

    await logActivity({
      action: "REGISTER",
      category: "AUTH",
      status: "SUCCESS",
      userId: user.id,
      email,
      message: "Account created",
      ...clientInfoFromHeaders(req.headers),
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    await logActivity({
      action: "ERROR",
      category: "ERROR",
      status: "FAILURE",
      message: "Registration failed",
      metadata: { route: "/api/auth/register", error: String(error) },
      ...clientInfoFromHeaders(req.headers),
    });
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
