"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";

type Log = {
  id: string;
  action: string;
  category: string;
  status: string;
  message: string | null;
  ipAddress: string | null;
  createdAt: string;
};

const CATEGORIES = ["", "AUTH", "ACCOUNT", "ERROR", "ADMIN", "SYSTEM"];

export function ActivityClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (category) params.set("category", category);
    const res = await fetch(`/api/me/activity?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Activity className="h-6 w-6 text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Activity</h1>
          <p className="text-sm text-slate-500">{total} events recorded for your account</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c || "all"}
            onClick={() => {
              setPage(1);
              setCategory(c);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              category === c ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {c || "All"}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-8 text-center text-slate-400">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="p-8 text-center text-slate-400">No activity yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{l.action}</td>
                  <td className="px-4 py-3 text-slate-500">{l.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        l.status === "SUCCESS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
