import { prisma } from "@/lib/prisma";

/**
 * Activity log helper — records user/system events for the admin audit trail.
 *
 * Logging is best-effort and MUST never break the calling request: every write
 * is wrapped in try/catch and failures are only logged to the console.
 */

export type ActivityAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "REGISTER"
  | "PASSWORD_CHANGED"
  | "ERROR";

export type ActivityCategory = "AUTH" | "ACCOUNT" | "ERROR" | "ADMIN" | "SYSTEM";

export type ActivityStatus = "SUCCESS" | "FAILURE";

export interface LogActivityInput {
  action: ActivityAction | string;
  category?: ActivityCategory;
  status?: ActivityStatus;
  userId?: string | null;
  email?: string | null;
  message?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Extract a best-effort client IP + user-agent from request headers. */
export function clientInfoFromHeaders(headers: Headers): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const fwd = headers.get("x-forwarded-for");
  const ipAddress =
    (fwd ? fwd.split(",")[0].trim() : null) ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    null;
  const userAgent = headers.get("user-agent");
  return { ipAddress, userAgent };
}

/**
 * Persist an activity log entry. Never throws.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action: input.action,
        category: input.category ?? "AUTH",
        status: input.status ?? "SUCCESS",
        userId: input.userId ?? null,
        email: input.email ? input.email.trim().toLowerCase() : null,
        message: input.message ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
  } catch (error) {
    console.error("logActivity failed:", error);
  }
}
