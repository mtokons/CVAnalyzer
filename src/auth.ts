import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { logActivity, clientInfoFromHeaders } from "@/lib/activity";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;

        const headers =
          request && "headers" in request ? (request as Request).headers : undefined;
        const client = headers
          ? clientInfoFromHeaders(headers)
          : { ipAddress: null, userAgent: null };

        if (!email || !password) {
          await logActivity({
            action: "LOGIN_FAILED",
            category: "AUTH",
            status: "FAILURE",
            email: email ?? null,
            message: "Missing email or password",
            ...client,
          });
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
          await logActivity({
            action: "LOGIN_FAILED",
            category: "AUTH",
            status: "FAILURE",
            email,
            message: "No account with this email",
            ...client,
          });
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          await logActivity({
            action: "LOGIN_FAILED",
            category: "AUTH",
            status: "FAILURE",
            userId: user.id,
            email,
            message: "Incorrect password",
            ...client,
          });
          return null;
        }

        await logActivity({
          action: "LOGIN_SUCCESS",
          category: "AUTH",
          status: "SUCCESS",
          userId: user.id,
          email,
          message: "Signed in",
          ...client,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      await logActivity({
        action: "LOGOUT",
        category: "AUTH",
        status: "SUCCESS",
        userId: (token?.id as string | undefined) ?? null,
        email: (token?.email as string | undefined) ?? null,
        message: "Signed out",
      });
    },
  },
});
