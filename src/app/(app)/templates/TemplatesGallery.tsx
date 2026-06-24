"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { LayoutTemplate, Check, Star, Search, Sparkles } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/Loading";

interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  recommendedFor: string[];
  accent: string;
  accentDark: string;
  serif: boolean;
}

type RoleFilter = "all" | "solution-architect" | "software-engineer";

const ROLE_LABELS: Record<RoleFilter, string> = {
  all: "All templates",
  "solution-architect": "Solution Architect",
  "software-engineer": "Software Engineer",
};

export function TemplatesGallery() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [recommended, setRecommended] = useState<string[]>([]);
  const [preferred, setPreferred] = useState<string>("");
  const [roleHint, setRoleHint] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setTemplates(d.templates);
        setRecommended(d.recommended || []);
        setPreferred(d.preferred || d.defaultTemplate);
        setRoleHint(d.roleHint || "");
      })
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setLoading(false));
  }, []);

  const choose = async (id: string) => {
    setSaving(id);
    try {
      const res = await fetch("/api/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: id }),
      });
      if (!res.ok) {
        toast.error("Could not save template");
        return;
      }
      setPreferred(id);
      toast.success("Template selected — it will be used for your next CV");
    } finally {
      setSaving(null);
    }
  };

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchesRole = filter === "all" || t.recommendedFor.includes(filter);
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [templates, filter, search]);

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
            <LayoutTemplate className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">CV Templates</h1>
            <p className="text-sm text-slate-400">
              20 styles tuned for the German job market (DIN-friendly, ATS-safe).
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none md:w-64"
          />
        </div>
      </div>

      {roleHint && (
        <div className="flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-600/10 px-4 py-3 text-sm text-brand-200">
          <Sparkles className="h-4 w-4" />
          Based on your profile (<span className="font-medium">{roleHint}</span>), we’ve highlighted{" "}
          {recommended.length} recommended templates with a{" "}
          <Star className="inline h-3.5 w-3.5 fill-amber-400 text-amber-400" /> badge.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(ROLE_LABELS) as RoleFilter[]).map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
              (filter === r
                ? "bg-brand-600 text-white"
                : "border border-slate-700 text-slate-300 hover:bg-white/5")
            }
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => {
          const isRecommended = recommended.includes(t.id);
          const isSelected = preferred === t.id;
          return (
            <motion.div
              key={t.id}
              whileHover={{ y: -3 }}
              className={
                "group overflow-hidden rounded-2xl border bg-slate-900 transition-colors " +
                (isSelected ? "border-brand-500" : "border-slate-800 hover:border-slate-700")
              }
            >
              <div className="relative h-56 overflow-hidden border-b border-slate-800 bg-white">
                {/* Live scaled preview of the actual rendered CV */}
                <iframe
                  src={`/api/templates/${t.id}/preview`}
                  title={t.name}
                  loading="lazy"
                  className="pointer-events-none absolute left-0 top-0 origin-top-left"
                  style={{ width: "200%", height: "200%", transform: "scale(0.5)", border: "0" }}
                />
                {isRecommended && (
                  <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-xs font-semibold text-amber-950 shadow">
                    <Star className="h-3 w-3 fill-amber-950" /> Recommended
                  </span>
                )}
                {isSelected && (
                  <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
                    <Check className="h-3 w-3" /> Selected
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: t.accent }}
                    aria-hidden
                  />
                  <h3 className="font-semibold text-white">{t.name}</h3>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{t.description}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => choose(t.id)}
                    disabled={saving === t.id}
                    className={
                      "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                      (isSelected
                        ? "bg-brand-600/20 text-brand-300"
                        : "bg-brand-600 text-white hover:bg-brand-500")
                    }
                  >
                    {isSelected ? "Selected" : saving === t.id ? "Saving…" : "Use this template"}
                  </button>
                  <a
                    href={`/api/templates/${t.id}/preview`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Preview
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-slate-500">No templates match your search.</p>
      )}
    </div>
  );
}
