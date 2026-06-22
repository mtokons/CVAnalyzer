import { auth } from "@/auth";

/**
 * Returns the authenticated user's id, or null if not signed in.
 * Use in API routes to scope data to the current user.
 */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
