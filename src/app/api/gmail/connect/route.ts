import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getUserId } from "@/lib/session";
import { buildAuthUrl, gmailConfigured } from "@/lib/gmail";

export const runtime = "nodejs";

// GET /api/gmail/connect — start the Google OAuth consent flow
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", req.url));

  if (!gmailConfigured()) {
    return NextResponse.redirect(new URL("/applications?gmail=unconfigured", req.url));
  }

  const origin = req.nextUrl.origin;
  const state = randomBytes(16).toString("hex");
  const authUrl = buildAuthUrl(origin, state);

  const res = NextResponse.redirect(authUrl);
  // Short-lived CSRF state cookie verified in the callback.
  res.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
