import type { NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/jobs",
  "/cv",
  "/cover-letters",
  "/apply",
  "/settings",
  "/admin",
];

/**
 * Edge-safe auth configuration shared between the middleware and the full
 * Node runtime auth instance. Must NOT import Prisma or other Node-only APIs.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
      if (isProtected && !isLoggedIn) return false; // redirect to signIn page
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // `role` is added to the user object by the credentials authorize callback.
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
