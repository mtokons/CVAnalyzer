import { auth } from "@/auth";

/**
 * Returns the authenticated user's id, or null if not signed in.
 * Use in API routes to scope data to the current user.
 */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Returns the authenticated user's role, or null if not signed in.
 */
export async function getUserRole(): Promise<string | null> {
  const session = await auth();
  return session?.user?.role ?? null;
}

/**
 * True when the signed-in user is an ADMIN or SUPER_ADMIN.
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
