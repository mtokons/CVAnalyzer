"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, Eye, Download, Building2 } from "lucide-react";
import { SkeletonCard } from "@/components/ui/Loading";

interface CV {
  id: string;
  title: string;
  template: string;
  htmlContent: string;
  createdAt: string;
  job: { title: string; company: string } | null;
}

export default function CVListPage() {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cv/generate")
      .then((r) => r.json())
      .then((data) => setCvs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My CVs</h1>
        <p className="text-slate-400 mt-1">All your generated, ATS-optimized resumes</p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : cvs.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No CVs generated yet</h3>
          <p className="text-slate-400 mb-6">Add a job and generate a tailored CV</p>
          <Link href="/jobs" className="btn-primary">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {cvs.map((cv, i) => (
            <motion.div
              key={cv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card p-5 hover:border-brand-500/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600/20">
                  <FileText className="w-5 h-5 text-brand-400" />
                </div>
                <span className="badge bg-slate-800 text-slate-400 capitalize">{cv.template}</span>
              </div>
              <h3 className="font-semibold text-white mb-1 truncate">{cv.title}</h3>
              {cv.job && (
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-4">
                  <Building2 size={13} /> {cv.job.company}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setPreview(cv.htmlContent)} className="btn-secondary !py-2 flex-1 text-sm">
                  <Eye size={16} /> Preview
                </button>
                <a
                  href={`/api/cv/${cv.id}/pdf`}
                  className="btn-ghost !p-2.5 border border-slate-700 flex items-center"
                  title="Download PDF"
                >
                  <Download size={16} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPreview(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe srcDoc={preview} className="w-full h-[85vh] rounded-2xl" title="CV Preview" />
          </motion.div>
        </div>
      )}
    </div>
  );
}
