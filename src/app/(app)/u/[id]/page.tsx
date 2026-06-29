"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { MapPin, Mail, Phone, Globe, Lock } from "lucide-react";

type PublicProfile = {
  id: string;
  name: string | null;
  image: string | null;
  summary: string | null;
  skills: string[] | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
};

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [p, setP] = useState<PublicProfile | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/users/${id}`).then(async (r) => {
      if (r.ok) setP(await r.json());
      else setErr((await r.json()).error || "Unavailable");
    });
  }, [id]);

  if (err)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <p className="text-slate-500">{err}</p>
      </div>
    );
  if (!p) return <p className="p-8 text-center text-slate-400">Loading…</p>;

  const skills = Array.isArray(p.skills) ? p.skills : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white">
            {(p.name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{p.name || "User"}</h1>
            {p.location && (
              <p className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> {p.location}
              </p>
            )}
          </div>
        </div>
        {p.summary && <p className="mb-4 text-sm text-slate-700">{p.summary}</p>}
        {skills.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {skills.map((s, i) => (
              <span key={i} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="space-y-1 text-sm text-slate-600">
          {p.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {p.email}</p>}
          {p.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {p.phone}</p>}
          {p.website && <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-slate-400" /> {p.website}</p>}
          {p.linkedin && <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-slate-400" /> {p.linkedin}</p>}
          {p.github && <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-slate-400" /> {p.github}</p>}
        </div>
      </div>
    </div>
  );
}
