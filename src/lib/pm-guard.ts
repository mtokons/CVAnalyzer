import { auth } from "@/auth";
import { canManageProjects } from "@/lib/roles";

/** Returns the session user if they may manage projects, else null. */
export async function requireProjectManager() {
  const session = await auth();
  if (!session?.user) return null;
  if (!canManageProjects(session.user.role)) return null;
  return session.user;
}
