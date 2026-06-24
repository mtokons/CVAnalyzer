import { NextResponse } from "next/server";
import { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  listMessages,
  getMessage,
  headerValue,
  parseAddress,
  categorizeEmail,
  categoryToJobStatus,
  refreshAccessToken,
  type EmailCategory,
} from "@/lib/gmail";

export const runtime = "nodejs";
export const maxDuration = 120;

// Job statuses, ordered so we only ever escalate (never downgrade) automatically.
const STATUS_RANK: Record<string, number> = {
  SAVED: 0,
  APPLIED: 1,
  INTERVIEW: 2,
  OFFER: 3,
  REJECTED: 2,
  WITHDRAWN: 1,
};

/** Returns a valid access token, refreshing it when expired. */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const acct = await prisma.gmailAccount.findUnique({ where: { userId } });
  if (!acct) return null;

  const notExpired = acct.expiryDate && acct.expiryDate.getTime() > Date.now() + 60_000;
  if (notExpired) {
    try {
      return decrypt(acct.accessToken);
    } catch {
      // fall through to refresh
    }
  }

  const tokens = await refreshAccessToken(decrypt(acct.refreshToken));
  const expiryDate = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
  await prisma.gmailAccount.update({
    where: { userId },
    data: { accessToken: encrypt(tokens.access_token), expiryDate },
  });
  return tokens.access_token;
}

/** Finds the best-matching applied job for an employer email. */
function matchJob(
  jobs: Array<{ id: string; company: string; title: string }>,
  fromEmail: string,
  fromName: string,
  subject: string
): string | null {
  const haystack = `${fromEmail} ${fromName} ${subject}`.toLowerCase();
  for (const job of jobs) {
    const company = job.company?.toLowerCase().trim();
    if (!company) continue;
    // Match on company name token or its domain-ish slug.
    const slug = company.replace(/\b(gmbh|ag|se|kg|inc|ltd|llc|co)\b/g, "").replace(/[^a-z0-9]/g, "");
    if (
      (company.length > 2 && haystack.includes(company)) ||
      (slug.length > 3 && haystack.replace(/[^a-z0-9]/g, "").includes(slug))
    ) {
      return job.id;
    }
  }
  return null;
}

// POST /api/gmail/sync — pull recent inbox messages and match employer replies
export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const acct = await prisma.gmailAccount.findUnique({ where: { userId } });
  if (!acct) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  let accessToken: string | null;
  try {
    accessToken = await getValidAccessToken(userId);
  } catch (e) {
    console.error("Gmail token refresh failed:", e);
    return NextResponse.json({ error: "Gmail authorization expired — please reconnect." }, { status: 401 });
  }
  if (!accessToken) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  // Candidate jobs to match against (anything the user has applied to).
  const jobs = await prisma.job.findMany({
    where: { userId, status: { in: ["APPLIED", "INTERVIEW", "OFFER"] } },
    select: { id: true, company: true, title: true, status: true },
  });

  let imported = 0;
  let matched = 0;
  const statusUpdates: Array<{ jobId: string; status: string }> = [];

  try {
    const ids = await listMessages(accessToken, "in:inbox newer_than:30d", 40);

    for (const { id } of ids) {
      // Skip messages already stored.
      const exists = await prisma.emailMessage.findUnique({ where: { gmailId: id } });
      if (exists) continue;

      const msg = await getMessage(accessToken, id);
      const from = parseAddress(headerValue(msg, "From"));
      const to = parseAddress(headerValue(msg, "To"));
      const subject = headerValue(msg, "Subject") ?? "";
      const dateHeader = headerValue(msg, "Date");
      const receivedAt = dateHeader ? new Date(dateHeader) : msg.internalDate ? new Date(Number(msg.internalDate)) : null;
      const snippet = msg.snippet ?? "";

      const jobId = matchJob(jobs, from.email ?? "", from.name ?? "", subject);
      const category: EmailCategory = categorizeEmail(subject, snippet);
      const isFromEmployer = Boolean(jobId);

      await prisma.emailMessage.create({
        data: {
          userId,
          jobId: jobId ?? undefined,
          gmailId: id,
          threadId: msg.threadId,
          fromEmail: from.email,
          fromName: from.name,
          toEmail: to.email,
          subject,
          snippet,
          receivedAt: receivedAt ?? undefined,
          category,
          isFromEmployer,
        },
      });
      imported++;

      if (jobId) {
        matched++;
        const target = categoryToJobStatus(category);
        const job = jobs.find((j) => j.id === jobId);
        if (target && job && (STATUS_RANK[target] ?? 0) > (STATUS_RANK[job.status] ?? 0)) {
          await prisma.job.update({ where: { id: jobId }, data: { status: target as JobStatus } });
          job.status = target as JobStatus;
          statusUpdates.push({ jobId, status: target });
        }
      }
    }

    await prisma.gmailAccount.update({
      where: { userId },
      data: { lastSyncedAt: new Date() },
    });
  } catch (e) {
    console.error("Gmail sync error:", e);
    return NextResponse.json({ error: "Sync failed. Try reconnecting Gmail." }, { status: 500 });
  }

  return NextResponse.json({ success: true, imported, matched, statusUpdates });
}
