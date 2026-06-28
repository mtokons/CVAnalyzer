"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Globe, Building2, ArrowRight, X, Loader2 } from "lucide-react";

type Project = {
  id: string;
  serial: string;
  name: string;
  partnerType: "DIRECT" | "INDIRECT";
  status: string;
  partnerName: string | null;
  country: string | null;
  currency: string;
  _count: { candidates: number };
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-500/20 text-slate-300",
  QUOTING: "bg-amber-500/20 text-amber-300",
  SUBMITTED: "bg-blue-500/20 text-blue-300",
  WON: "bg-emerald-500/20 text-emerald-300",
  LOST: "bg-red-500/20 text-red-300",
  CLOSED: "bg-slate-700/40 text-slate-400",
};

export function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", partnerType: "INDIRECT", partnerName: "", country: "", description: "" });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/pm/projects");
    const data = await res.json();
    setProjects(data.projects ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/pm/projects", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { setShow(false); setForm({ name: "", partnerType: "INDIRECT", partnerName: "", country: "", description: "" }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-7 h-7 text-brand-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Project Management</h1>
            <p className="text-sm text-slate-400">Expert sourcing, quotes &amp; reports for partner tenders</p>
          </div>
        </div>
        <button onClick={() => setShow(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-500">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">No projects yet. Create your first quote project.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-brand-600/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-500">{p.serial}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? STATUS_COLORS.DRAFT}`}>{p.status}</span>
              </div>
              <h3 className="text-white font-bold leading-tight mb-1">{p.name}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                <span className="inline-flex items-center gap-1">{p.partnerType === "DIRECT" ? <Building2 className="w-3 h-3" /> : <Globe className="w-3 h-3" />}{p.partnerType}</span>
                {p.country && <span>{p.country}</span>}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{p._count.candidates} experts</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-white font-bold">New Project</h2><button onClick={() => setShow(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <input className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white text-sm" placeholder="Project name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="bg-slate-800 rounded-lg px-3 py-2 text-white text-sm" value={form.partnerType} onChange={(e) => setForm({ ...form, partnerType: e.target.value })}>
                <option value="INDIRECT">Indirect partner</option>
                <option value="DIRECT">Direct partner</option>
              </select>
              <input className="bg-slate-800 rounded-lg px-3 py-2 text-white text-sm" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <input className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white text-sm" placeholder="Upstream partner / client" value={form.partnerName} onChange={(e) => setForm({ ...form, partnerName: e.target.value })} />
            <textarea className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white text-sm" placeholder="Description / requirements" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button disabled={saving} onClick={create} className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-bold disabled:opacity-60">{saving ? "Creating..." : "Create Project"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
