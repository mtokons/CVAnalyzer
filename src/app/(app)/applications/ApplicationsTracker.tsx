"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Inbox,
  Mail,
  RefreshCw,
  Link2,
  CheckCircle2,
  Calendar,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/Loading";

interface EmailItem {
  id: string;
  subject: string | null;
  snippet: string | null;
  fromName: string | null;
  fromEmail: string | null;
  category: string;
  receivedAt: string | null;
}

interface Application {
  id: string;
  title: string;
  company: string;
  location: string | null;
  status: string;
  appliedAt: string | null;
  updatedAt: string;
  emails: EmailItem[];
}

interface GmailStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  APPLIED: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  INTERVIEW: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  OFFER: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  REJECTED: "bg-red-500/15 text-red-300 border-red-500/30",
  WITHDRAWN: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const CATEGORY_STYLES: Record<string, string> = {
  INTERVIEW: "bg-amber-500/15 text-amber-300",
  OFFER: "bg-emerald-500/15 text-emerald-300",
  REJECTION: "bg-red-500/15 text-red-300",
  ACKNOWLEDGEMENT: "bg-blue-500/15 text-blue-300",
  OTHER: "bg-slate-600/30 text-slate-300",
};

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function ApplicationsTracker() {
  const searchParams = useSearchParams();
  const [apps, setApps] = useState<Application[]>([]);
  const [unmatched, setUnmatched] = useState<EmailItem[]>([]);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const [appsRes, gmailRes] = await Promise.all([
      fetch("/api/applications"),
      fetch("/api/gmail/status"),
    ]);
    if (appsRes.ok) {
      const d = await appsRes.json();
      setApps(d.applications || []);
      setUnmatched(d.unmatched || []);
    }
    if (gmailRes.ok) setGmail(await gmailRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const g = searchParams.get("gmail");
    if (!g) return;
    const messages: Record<string, [string, boolean]> = {
      connected: ["Gmail connected — sync to import employer replies", true],
      unconfigured: ["Gmail isn't configured on the server yet", false],
      error: ["Gmail connection was cancelled", false],
      state_mismatch: ["Security check failed — please try connecting again", false],
      no_refresh: ["Couldn't get long-term access — remove app access in Google and retry", false],
      failed: ["Gmail connection failed — please retry", false],
    };
    const entry = messages[g];
    if (entry) entry[1] ? toast.success(entry[0]) : toast.error(entry[0]);
  }, [searchParams]);

  const sync = async () => {
    setSyncing(true);
    const id = toast.loading("Syncing inbox…");
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || "Sync failed", { id });
        return;
      }
      toast.success(`Imported ${d.imported} email(s), ${d.matched} matched to applications`, { id });
      load();
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Gmail? Imported emails stay, but no new replies will sync.")) return;
    await fetch("/api/gmail/status", { method: "DELETE" });
    toast.success("Gmail disconnected");
    load();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
            <Inbox className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Application Tracking</h1>
            <p className="text-sm text-slate-400">
              Every application and employer reply, in one timeline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {gmail?.connected ? (
            <>
              <button
                onClick={sync}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
              >
                <RefreshCw className={"h-4 w-4 " + (syncing ? "animate-spin" : "")} />
                {syncing ? "Syncing…" : "Sync inbox"}
              </button>
              <button
                onClick={disconnect}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Disconnect
              </button>
            </>
          ) : (
            <a
              href="/api/gmail/connect"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              <Link2 className="h-4 w-4" /> Connect Gmail
            </a>
          )}
        </div>
      </div>

      {gmail?.connected && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          Connected as <span className="font-medium">{gmail.email}</span>
          {gmail.lastSyncedAt && (
            <span className="text-emerald-300/70">· last synced {formatDate(gmail.lastSyncedAt)}</span>
          )}
        </div>
      )}

      {gmail && !gmail.configured && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-600/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          Gmail auto-import isn’t configured on the server yet (missing Google OAuth credentials).
          You can still track applications manually.
        </div>
      )}

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
          <Mail className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-slate-400">No applications yet. Apply to a job to start tracking it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{app.title}</h3>
                  <p className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Building2 className="h-3.5 w-3.5" /> {app.company}
                    {app.location ? ` · ${app.location}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {app.appliedAt && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" /> {formatDate(app.appliedAt)}
                    </span>
                  )}
                  <span
                    className={
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium " +
                      (STATUS_STYLES[app.status] || STATUS_STYLES.WITHDRAWN)
                    }
                  >
                    {app.status}
                  </span>
                </div>
              </div>

              {app.emails.length > 0 && (
                <div className="mt-4 space-y-2 border-l-2 border-slate-800 pl-4">
                  {app.emails.map((e) => (
                    <div key={e.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-500" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase " +
                            (CATEGORY_STYLES[e.category] || CATEGORY_STYLES.OTHER)
                          }
                        >
                          {e.category}
                        </span>
                        <span className="text-sm font-medium text-slate-200">{e.subject || "(no subject)"}</span>
                        <span className="text-xs text-slate-500">{formatDate(e.receivedAt)}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {e.fromName || e.fromEmail} — {e.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">
            Other recent emails (not matched to an application)
          </h3>
          <div className="space-y-2">
            {unmatched.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase " +
                    (CATEGORY_STYLES[e.category] || CATEGORY_STYLES.OTHER)
                  }
                >
                  {e.category}
                </span>
                <span className="text-sm text-slate-300">{e.subject || "(no subject)"}</span>
                <span className="text-xs text-slate-500">{e.fromName || e.fromEmail}</span>
                <span className="text-xs text-slate-600">{formatDate(e.receivedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
