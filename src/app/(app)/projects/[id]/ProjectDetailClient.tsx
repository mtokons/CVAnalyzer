"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, FileText, Sparkles, Loader2, Trash2, Euro, TrendingUp,
  Wallet, Users, FileBarChart, X,
} from "lucide-react";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "PKR", "BDT", "INR", "AED", "SAR", "TRY", "SEK", "PLN"];

type Candidate = {
  id: string; serial: string; fullName: string; profession: string | null; country: string | null;
  category: string | null; rating: number | null; source: string; cvFormat: string | null;
  standardCvUrl: string | null; rateAmount: number | null; rateCurrency: string;
};
type PC = {
  id: string; candidateId: string; expertRate: number | null; expertCurrency: string;
  partnerRate: number | null; partnerCurrency: string; expertRateEur: number | null;
  partnerRateEur: number | null; marginEur: number | null; status: string; candidate: Candidate;
};
type Project = {
  id: string; serial: string; name: string; partnerType: string; status: string;
  partnerName: string | null; country: string | null; ratingGuide: string | null;
  candidates: PC[]; reports: { id: string; title: string; createdAt: string }[];
};

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [totals, setTotals] = useState({ cost: 0, bill: 0, margin: 0 });
  const [pool, setPool] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [showCand, setShowCand] = useState(false);
  const [showAssign, setShowAssign] = useState("");
  const [newCand, setNewCand] = useState({ fullName: "", profession: "", country: "", source: "ONLINE", rateAmount: "", rateCurrency: "EUR" });
  const [rates, setRates] = useState({ expertRate: "", expertCurrency: "EUR", partnerRate: "", partnerCurrency: "EUR" });

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([fetch(`/api/pm/projects/${projectId}`), fetch("/api/pm/candidates")]);
    const p = await pRes.json(); const c = await cRes.json();
    setProject(p.project); setTotals(p.totals ?? { cost: 0, bill: 0, margin: 0 }); setPool(c.candidates ?? []);
    setLoading(false);
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const createCandidate = async () => {
    if (!newCand.fullName.trim()) return;
    setBusy("cand");
    await fetch("/api/pm/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newCand, rateAmount: parseFloat(newCand.rateAmount) || null }) });
    setBusy(""); setShowCand(false); setNewCand({ fullName: "", profession: "", country: "", source: "ONLINE", rateAmount: "", rateCurrency: "EUR" }); load();
  };
  const assign = async (candidateId: string) => {
    setBusy(candidateId);
    await fetch(`/api/pm/projects/${projectId}/candidates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidateId, expertRate: parseFloat(rates.expertRate) || null, expertCurrency: rates.expertCurrency, partnerRate: parseFloat(rates.partnerRate) || null, partnerCurrency: rates.partnerCurrency }) });
    setBusy(""); setShowAssign(""); setRates({ expertRate: "", expertCurrency: "EUR", partnerRate: "", partnerCurrency: "EUR" }); load();
  };
  const removePc = async (candidateId: string) => { setBusy(candidateId); await fetch(`/api/pm/projects/${projectId}/candidates?candidateId=${candidateId}`, { method: "DELETE" }); setBusy(""); load(); };
  const standardize = async (id: string) => { setBusy(id); await fetch(`/api/pm/candidates/${id}/standardize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format: "INTERNATIONAL" }) }); setBusy(""); load(); };
  const report = async () => { setBusy("report"); await fetch(`/api/pm/projects/${projectId}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); setBusy(""); load(); };

  if (loading || !project) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>;
  const assigned = new Set(project.candidates.map((c) => c.candidateId));

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Projects</Link>
      <div className="flex items-center justify-between">
        <div><span className="text-xs font-mono text-slate-500">{project.serial}</span><h1 className="text-2xl font-bold text-white">{project.name}</h1><p className="text-sm text-slate-400">{project.partnerType} · {project.partnerName ?? "—"} · {project.country ?? "—"}</p></div>
        <button onClick={report} disabled={busy === "report"} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-60"><FileBarChart className="w-4 h-4" /> Generate Report</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat icon={<Wallet className="w-4 h-4" />} label="We pay experts" value={totals.cost} />
        <Stat icon={<Euro className="w-4 h-4" />} label="Partner pays us" value={totals.bill} />
        <Stat icon={<TrendingUp className="w-4 h-4" />} label="Margin (EUR)" value={totals.margin} accent />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between p-4 border-b border-slate-800"><h2 className="text-white font-bold flex items-center gap-2"><Users className="w-4 h-4" /> Experts</h2><button onClick={() => setShowCand(true)} className="text-xs inline-flex items-center gap-1 text-brand-300"><Plus className="w-3 h-3" /> New candidate</button></div>
        {project.candidates.length === 0 ? <p className="p-6 text-sm text-slate-500">No experts yet. Add candidates from the pool below.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-500 text-xs"><th className="text-left p-3">Serial</th><th className="text-left">Name</th><th className="text-left">Rate (EUR)</th><th className="text-left">Bill (EUR)</th><th className="text-left">Margin</th><th className="text-left">CV</th><th></th></tr></thead>
            <tbody>{project.candidates.map((pc) => (
              <tr key={pc.id} className="border-t border-slate-800/60 text-slate-300">
                <td className="p-3 font-mono text-xs">{pc.candidate.serial}</td><td>{pc.candidate.fullName}</td>
                <td>€{(pc.expertRateEur ?? 0).toFixed(0)}</td><td>€{(pc.partnerRateEur ?? 0).toFixed(0)}</td>
                <td className="text-emerald-400">€{(pc.marginEur ?? 0).toFixed(0)}</td>
                <td>{pc.candidate.standardCvUrl ? <Link href={pc.candidate.standardCvUrl} className="text-brand-300">View</Link> : <button onClick={() => standardize(pc.candidateId)} disabled={busy === pc.candidateId} className="text-xs inline-flex items-center gap-1 text-amber-300"><Sparkles className="w-3 h-3" /> Standardize</button>}</td>
                <td><button onClick={() => removePc(pc.candidateId)} className="text-red-400"><Trash2 className="w-4 h-4" /></button></td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-white font-bold mb-3">Candidate pool</h2>
        <div className="grid gap-2 sm:grid-cols-2">{pool.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-800/50 px-3 py-2">
            <div><p className="text-sm text-white">{c.fullName} <span className="text-xs font-mono text-slate-500">{c.serial}</span></p><p className="text-xs text-slate-400">{c.profession ?? "—"} · {c.source}</p></div>
            {assigned.has(c.id) ? <span className="text-xs text-emerald-400">Assigned</span> : <button onClick={() => setShowAssign(c.id)} className="text-xs text-brand-300">+ Add</button>}
          </div>))}
        </div>
      </div>

      {project.reports.length > 0 && <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"><h2 className="text-white font-bold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Reports</h2>{project.reports.map((r) => <p key={r.id} className="text-sm text-slate-300">{r.title} · {new Date(r.createdAt).toLocaleDateString()}</p>)}</div>}

      {showCand && <Modal onClose={() => setShowCand(false)} title="New candidate"><input className="modal-in" placeholder="Full name *" value={newCand.fullName} onChange={(e) => setNewCand({ ...newCand, fullName: e.target.value })} /><input className="modal-in" placeholder="Profession" value={newCand.profession} onChange={(e) => setNewCand({ ...newCand, profession: e.target.value })} /><input className="modal-in" placeholder="Country" value={newCand.country} onChange={(e) => setNewCand({ ...newCand, country: e.target.value })} /><select className="modal-in" value={newCand.source} onChange={(e) => setNewCand({ ...newCand, source: e.target.value })}><option value="ONLINE">Online (portal CV)</option><option value="OFFLINE">Offline (scanned)</option></select><button disabled={busy === "cand"} onClick={createCandidate} className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-bold">{busy === "cand" ? "Saving..." : "Create"}</button></Modal>}
      {showAssign && <Modal onClose={() => setShowAssign("")} title="Set rates (auto-converted to EUR)"><div className="grid grid-cols-2 gap-2"><input className="modal-in" placeholder="Expert rate" value={rates.expertRate} onChange={(e) => setRates({ ...rates, expertRate: e.target.value })} /><select className="modal-in" value={rates.expertCurrency} onChange={(e) => setRates({ ...rates, expertCurrency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select><input className="modal-in" placeholder="Partner rate" value={rates.partnerRate} onChange={(e) => setRates({ ...rates, partnerRate: e.target.value })} /><select className="modal-in" value={rates.partnerCurrency} onChange={(e) => setRates({ ...rates, partnerCurrency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div><button onClick={() => assign(showAssign)} className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-bold">Add to project</button></Modal>}
      <style>{`.modal-in{width:100%;background:#1e293b;border-radius:.5rem;padding:.5rem .75rem;color:#fff;font-size:.875rem}`}</style>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? "border-emerald-700/50 bg-emerald-950/20" : "border-slate-800 bg-slate-900/50"}`}><div className="flex items-center gap-2 text-slate-400 text-xs">{icon}{label}</div><p className={`text-2xl font-bold mt-1 ${accent ? "text-emerald-400" : "text-white"}`}>€{value.toFixed(0)}</p></div>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-3"><div className="flex items-center justify-between"><h2 className="text-white font-bold">{title}</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>{children}</div></div>;
}
