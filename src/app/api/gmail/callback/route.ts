import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { encrypt } from "@/lib/encryption";
import { exchangeCodeForTokens, fetchGoogleEmail } from "@/lib/gmail";

export const runtime = "nodejs";

// GET /api/gmail/callback — OAuth redirect target; stores encrypted tokens
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", req.url));

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieState = req.cookies.get("gmail_oauth_state")?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/applications?gmail=error`, req.url));
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL(`/applications?gmail=state_mismatch`, req.url));
  }

  try {
    const origin = url.origin;
    const tokens = await exchangeCodeForTokens(code, origin);
    const email = (await fetchGoogleEmail(tokens.access_token)) ?? "unknown";
    const expiryDate = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);

    // refresh_token is only returned on first consent; preserve existing if absent.
    const existing = await prisma.gmailAccount.findUnique({ where: { userId } });
    const refreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : existing?.refreshToken;

    if (!refreshToken) {
      return NextResponse.redirect(new URL(`/applications?gmail=no_refresh`, req.url));
    }

    await prisma.gmailAccount.upsert({
      where: { userId },
      create: {
        userId,
        email,
        accessToken: encrypt(tokens.access_token),
        refreshToken,
        expiryDate,
        scope: tokens.scope,
      },
      update: {
        email,
        accessToken: encrypt(tokens.access_token),
        refreshToken,
        expiryDate,
        scope: tokens.scope,
      },
    });

    const res = NextResponse.redirect(new URL(`/applications?gmail=connected`, req.url));
    res.cookies.delete("gmail_oauth_state");
    return res;
  } catch (e) {
    console.error("Gmail callback error:", e);
    return NextResponse.redirect(new URL(`/applications?gmail=failed`, req.url));
  }
}
