"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Building2, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { SkeletonCard } from "@/components/ui/Loading";

interface CoverLetter {
  id: string;
  title: string;
  content: string;
  tone: string;
  createdAt: string;
  job: { title: string; company: string } | null;
}

export default function CoverLettersPage() {
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cover-letter/generate")
      .then((r) => r.json())
      .then((data) => setLetters(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyText = (id: string, html: string) => {
    const text = html.replace(/<[^>]+>/g, "").replace(/\n{2,}/g, "\n\n");
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Cover Letters</h1>
        <p className="text-slate-400 mt-1">Personalized cover letters for every application</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : letters.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Mail className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No cover letters yet</h3>
          <p className="text-slate-400 mb-6">Generate one from any job</p>
          <Link href="/jobs" className="btn-primary">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {letters.map((letter, i) => (
            <motion.div
              key={letter.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">{letter.title}</h3>
                  {letter.job && (
                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                      <Building2 size={13} /> {letter.job.company}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-brand-600/20 text-brand-300 capitalize">{letter.tone}</span>
                  <button
                    onClick={() => copyText(letter.id, letter.content)}
                    className="btn-ghost !p-2 border border-slate-700"
                  >
                    {copiedId === letter.id ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>
              <div
                className="prose prose-invert prose-sm max-w-none text-slate-300 bg-slate-800/30 rounded-xl p-4"
                dangerouslySetInnerHTML={{ __html: letter.content }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
