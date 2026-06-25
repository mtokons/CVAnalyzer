"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { ShieldCheck, Users, Briefcase, FileText, Mail, Trash2, Activity } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/Loading";
import { ActivityLog } from "./ActivityLog";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { jobs: number; cvDocuments: number; coverLetters: number };
}

interface Stats {
  users: number;
  jobs: number;
  cvs: number;
  coverLetters: number;
}

const ROLES = ["USER", "ADMIN", "SUPER_ADMIN"];

export function AdminDashboard({
  isSuperAdmin,
  currentUserId,
}: {
  isSuperAdmin: boolean;
  currentUserId: string;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "activity">("users");

  const load = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        toast.error("Failed to load users");
        return;
      }
      const data = await res.json();
      setStats(data.stats);
      setUsers(data.users);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (id: string, role: string) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to update role");
      return;
    }
    toast.success("Role updated");
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Delete user ${email}? This removes all their data.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Failed to delete user");
      return;
    }
    toast.success("User deleted");
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const statCards = [
    { label: "Users", value: stats?.users ?? 0, icon: Users },
    { label: "Jobs", value: stats?.jobs ?? 0, icon: Briefcase },
    { label: "CVs", value: stats?.cvs ?? 0, icon: FileText },
    { label: "Cover Letters", value: stats?.coverLetters ?? 0, icon: Mail },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-sm text-slate-400">
            {isSuperAdmin ? "Super Admin — full control" : "Read-only admin view"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <Icon className="mb-3 h-5 w-5 text-brand-400" />
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        <button
          onClick={() => setTab("users")}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "users"
              ? "bg-brand-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          Users
        </button>
        <button
          onClick={() => setTab("activity")}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "activity"
              ? "bg-brand-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Activity className="h-4 w-4" />
          Activity Log
        </button>
      </div>

      {tab === "activity" ? (
        <ActivityLog />
      ) : (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-center">Jobs</th>
              <th className="px-4 py-3 text-center">CVs</th>
              <th className="px-4 py-3 text-center">Letters</th>
              {isSuperAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{u.name || u.email.split("@")[0]}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {isSuperAdmin && !isSelf ? (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={
                          u.role === "SUPER_ADMIN"
                            ? "text-brand-300"
                            : u.role === "ADMIN"
                            ? "text-emerald-300"
                            : "text-slate-400"
                        }
                      >
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300">{u._count.jobs}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{u._count.cvDocuments}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{u._count.coverLetters}</td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
