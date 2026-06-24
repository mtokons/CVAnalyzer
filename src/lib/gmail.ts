/**
 * Minimal Gmail integration using Google's OAuth 2.0 + Gmail REST API.
 *
 * No heavy SDK — just `fetch` — so it runs anywhere (Cloud Run / edge-ish).
 * Tokens are stored encrypted (see src/lib/encryption.ts) on the GmailAccount
 * row. We only ever request the read-only Gmail scope.
 *
 * Required environment variables:
 *   GOOGLE_CLIENT_ID      — OAuth 2.0 client id
 *   GOOGLE_CLIENT_SECRET  — OAuth 2.0 client secret
 * Redirect URI is derived from the incoming request origin and must be
 * registered in the Google Cloud console (both localhost and production).
 */

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

export function gmailConfigured(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!id || !secret) return false;
  // Treat placeholder values (e.g. "your-google-client-id") as not configured.
  if (id.startsWith("your-") || secret.startsWith("your-")) return false;
  return true;
}

export function buildRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/gmail/callback`;
}

export function buildAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: buildRedirectUri(origin),
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(
  code: string,
  origin: string
): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: buildRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Reads the connected account's email address from the userinfo endpoint. */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: GmailHeader[] };
}

/** Lists message ids matching a query (default: inbox, last 30 days). */
export async function listMessages(
  accessToken: string,
  query = "in:inbox newer_than:30d",
  maxResults = 30
): Promise<Array<{ id: string; threadId: string }>> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Gmail list failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { messages?: Array<{ id: string; threadId: string }> };
  return data.messages ?? [];
}

export async function getMessage(accessToken: string, id: string): Promise<GmailMessage> {
  const params = new URLSearchParams({
    format: "metadata",
    metadataHeaders: "From",
  });
  // metadataHeaders only accepts one per key repetition — append the rest.
  params.append("metadataHeaders", "To");
  params.append("metadataHeaders", "Subject");
  params.append("metadataHeaders", "Date");
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Gmail get failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export function headerValue(msg: GmailMessage, name: string): string | undefined {
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

/** Splits a "Display Name <email@x>" header into parts. */
export function parseAddress(raw?: string): { name?: string; email?: string } {
  if (!raw) return {};
  const match = raw.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, "").trim() || undefined, email: match[2].trim().toLowerCase() };
  }
  return { email: raw.trim().toLowerCase() };
}

export type EmailCategory = "INTERVIEW" | "OFFER" | "REJECTION" | "ACKNOWLEDGEMENT" | "OTHER";

/** Heuristic categorisation of an employer reply from subject + snippet. */
export function categorizeEmail(subject = "", snippet = ""): EmailCategory {
  const text = `${subject} ${snippet}`.toLowerCase();
  if (/(interview|vorstellungsgespr|einladung|schedule a call|meet|gespräch)/.test(text)) {
    return "INTERVIEW";
  }
  if (/(offer|angebot|vertrag|congratulations|pleased to offer|zusage)/.test(text)) {
    return "OFFER";
  }
  if (/(unfortunately|leider|regret|absage|not moving forward|rejected|declined|nicht berücksichtig)/.test(text)) {
    return "REJECTION";
  }
  if (/(received your application|application received|thank you for applying|eingegangen|bewerbung erhalten|bestätigung|confirm)/.test(text)) {
    return "ACKNOWLEDGEMENT";
  }
  return "OTHER";
}

/** Maps an email category to a job status escalation (or null to leave as-is). */
export function categoryToJobStatus(category: EmailCategory): string | null {
  switch (category) {
    case "INTERVIEW":
      return "INTERVIEW";
    case "OFFER":
      return "OFFER";
    case "REJECTION":
      return "REJECTED";
    default:
      return null;
  }
}
