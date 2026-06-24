"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Settings, Key, Plus, Trash2, Shield, Lock, Bot } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/Loading";

interface Credential {
  id: string;
  portalName: string;
  portalUrl: string;
  username: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ portalName: "", portalUrl: "", username: "", password: "" });
  const [ai, setAi] = useState<{ engine: string; model: string } | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/credentials");
      const data = await res.json();
      setCredentials(Array.isArray(data) ? data : []);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetch("/api/ai/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAi(d))
      .catch(() => {});
  }, []);

  const saveCredential = async () => {
    if (!form.portalName || !form.portalUrl || !form.username || !form.password) {
      toast.error("Fill all fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Credentials saved & encrypted");
        setForm({ portalName: "", portalUrl: "", username: "", password: "" });
        load();
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteCredential = async (id: string) => {
    if (!confirm("Delete these credentials?")) return;
    await fetch(`/api/credentials?id=${id}`, { method: "DELETE" });
    toast.success("Deleted");
    load();
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">AI configuration & portal credentials</p>
      </div>

      {/* AI Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bot size={18} className="text-brand-400" /> AI Providers
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${ai?.engine === "claude" ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
              <div>
                <p className="font-medium text-white">Anthropic Claude</p>
                <p className="text-xs text-slate-500">
                  {ai?.engine === "claude" ? `Primary — ${ai.model}` : "Set ANTHROPIC_API_KEY in .env to enable"}
                </p>
              </div>
            </div>
            <span className={`badge ${ai?.engine === "claude" ? "bg-green-500/15 text-green-400" : "bg-slate-700 text-slate-400"}`}>
              {ai?.engine === "claude" ? "Active" : "Optional"}
            </span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${ai?.engine === "gemini" ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
              <div>
                <p className="font-medium text-white">Google Gemini</p>
                <p className="text-xs text-slate-500">
                  {ai?.engine === "gemini" ? `Primary — ${ai.model}` : "Fallback — set GEMINI_API_KEY in .env"}
                </p>
              </div>
            </div>
            <span className={`badge ${ai?.engine === "gemini" ? "bg-green-500/15 text-green-400" : "bg-slate-700 text-slate-400"}`}>
              {ai?.engine === "gemini" ? "Active" : "Optional"}
            </span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${ai?.engine === "fallback" || !ai ? "bg-amber-400" : "bg-slate-500"}`} />
              <div>
                <p className="font-medium text-white">Local Fallback</p>
                <p className="text-xs text-slate-500">Deterministic generation when no AI key is configured</p>
              </div>
            </div>
            <span className={`badge ${ai?.engine === "fallback" ? "bg-amber-500/15 text-amber-400" : "bg-slate-700 text-slate-400"}`}>
              {ai?.engine === "fallback" ? "Active" : "Standby"}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Claude is preferred for CV analysis when configured. Set your API keys in the{" "}
          <code className="text-brand-400">.env</code> file (or hosting secrets) and restart the
          server. Force a provider with <code className="text-brand-400">AI_PROVIDER=claude</code>.
        </p>
      </motion.div>

      {/* Portal credentials */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Key size={18} className="text-brand-400" /> Portal Credentials
          </h2>
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <Lock size={12} /> AES-256 Encrypted
          </span>
        </div>
        <p className="text-sm text-slate-400 mb-5">
          Stored securely for auto-fill login. Used only during the automation you trigger.
        </p>

        {/* Add form */}
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <input
            className="input"
            placeholder="Portal name (e.g. LinkedIn)"
            value={form.portalName}
            onChange={(e) => setForm({ ...form, portalName: e.target.value })}
          />
          <input
            className="input"
            placeholder="Portal URL"
            value={form.portalUrl}
            onChange={(e) => setForm({ ...form, portalUrl: e.target.value })}
          />
          <input
            className="input"
            placeholder="Username / Email"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button onClick={saveCredential} disabled={saving} className="btn-primary w-full mb-6">
          {saving ? <LoadingSpinner /> : <Plus size={18} />} Add Credential
        </button>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner className="text-brand-500" />
          </div>
        ) : credentials.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No credentials saved</p>
        ) : (
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-brand-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{cred.portalName}</p>
                    <p className="text-xs text-slate-500">{cred.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteCredential(cred.id)}
                  className="btn-ghost !p-2 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
