"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  UserPlus,
  KeyRound,
  AlertTriangle,
  ShieldAlert,
  Activity as ActivityIcon,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/Loading";

interface LogEntry {
  id: string;
  action: string;
  category: string;
  status: string;
  email: string | null;
  message: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; role: string } | null;
}

interface ActivityResponse {
  logs: LogEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  actions: { action: string; count: number }[];
}

const STATUS_OPTIONS = ["", "SUCCESS", "FAILURE"];
const CATEGORY_OPTIONS = ["", "AUTH", "ACCOUNT", "ERROR", "ADMIN", "SYSTEM"];

function actionIcon(action: string) {
  switch (action) {
    case "LOGIN_SUCCESS":
      return LogIn;
    case "LOGIN_FAILED":
      return ShieldAlert;
    case "LOGOUT":
      return LogOut;
    case "REGISTER":
      return UserPlus;
    case "PASSWORD_CHANGED":
      return KeyRound;
    case "ERROR":
      return AlertTriangle;
    default:
      return ActivityIcon;
  }
}

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function ActivityLog() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [action, setAction] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (action) params.set("action", action);
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/activity?${params.toString()}`);
      if (!res.ok) {
        toast.error("Failed to load activity log");
        return;
      }
      setData(await res.json());
    } catch {
      toast.error("Failed to load activity log");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, action, category, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setAction("");
    setCategory("");
    setStatus("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-center md:flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, message or IP…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
        >
          <option value="">All actions</option>
          {(data?.actions ?? []).map((a) => (
            <option key={a.action} value={a.action}>
              {formatAction(a.action)} ({a.count})
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c || "All categories"}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || "All status"}
            </option>
          ))}
        </select>

        <button
          onClick={resetFilters}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Reset
        </button>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
            <ActivityIcon className="h-8 w-8" />
            <p className="text-sm">No activity matches your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3 text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => {
                  const Icon = actionIcon(log.action);
                  const failed = log.status === "FAILURE";
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                              failed
                                ? "bg-red-500/10 text-red-400"
                                : "bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <p className="font-medium text-white">{formatAction(log.action)}</p>
                            <p className="text-[11px] text-slate-500">{log.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <>
                            <p className="text-white">
                              {log.user.name || log.user.email.split("@")[0]}
                            </p>
                            <p className="text-[11px] text-slate-500">{log.user.email}</p>
                          </>
                        ) : (
                          <p className="text-slate-400">{log.email || "—"}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <span
                          className={
                            failed ? "text-red-300" : "text-slate-300"
                          }
                        >
                          {log.message || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {log.ipAddress || "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-right text-xs text-slate-400"
                        title={new Date(log.createdAt).toLocaleString()}
                      >
                        {timeAgo(log.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <p>
            {data.total} events · page {data.page} of {data.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
