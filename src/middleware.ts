import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe middleware: uses the JWT session cookie only (no DB access).
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Run on all routes except static assets, image optimization, the auth API,
  // and favicon. Route protection itself is handled by the `authorized` callback.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
