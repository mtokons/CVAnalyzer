"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowRight,
  Eye,
} from "lucide-react";
import { ScoreBadge } from "@/components/ui/ATSScore";
import { LoadingSpinner } from "@/components/ui/Loading";

interface Job {
  id: string;
  title: string;
  company: string;
  atsScore: number | null;
  status: string;
  applicationUrl: string | null;
  portalUrl: string | null;
  cvDocuments?: unknown[];
  coverLetters?: unknown[];
  application?: { fillStatus: string; screenshotUrl: string | null } | null;
}

export default function ApplyPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const autoApply = async (jobId: string) => {
    setApplyingId(jobId);
    const toastId = toast.loading("Launching browser & auto-filling...");
    try {
      const res = await fetch("/api/automation/fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Filled ${data.filledFields}/${data.totalFields} fields — verify in browser!`,
          { id: toastId, duration: 6000 }
        );
        load();
      } else {
        toast.error(data.message || "Automation failed", { id: toastId });
      }
    } catch {
      toast.error("Automation failed", { id: toastId });
    } finally {
      setApplyingId(null);
    }
  };

  const readyJobs = jobs.filter((j) => j.applicationUrl || j.portalUrl);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Auto Apply</h1>
        <p className="text-slate-400 mt-1">
          Let AI fill applications. You verify & submit manually.
        </p>
      </div>

      {/* Safety notice */}
      <div className="glass-card p-5 mb-6 bg-amber-500/5 border-amber-500/20">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300 mb-1">Human-in-the-loop by design</p>
            <p className="text-sm text-slate-400">
              The automation fills forms but <strong className="text-white">never submits</strong>.
              A browser window opens for you to review every field before submitting. Your portal
              credentials are encrypted with AES-256.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size={32} className="text-brand-500" />
        </div>
      ) : readyJobs.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Zap className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No applications ready</h3>
          <p className="text-slate-400 mb-6">
            Add jobs with application URLs to enable auto-fill
          </p>
          <Link href="/jobs/new" className="btn-primary">
            Add Job <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {readyJobs.map((job, i) => {
            const hasCV = (job.cvDocuments?.length ?? 0) > 0;
            const hasCL = (job.coverLetters?.length ?? 0) > 0;
            const ready = hasCV && hasCL;

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white truncate">{job.title}</h3>
                      {job.atsScore != null && <ScoreBadge score={job.atsScore} />}
                    </div>
                    <p className="text-sm text-slate-400 flex items-center gap-1.5 mb-2">
                      <Building2 size={14} /> {job.company}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`flex items-center gap-1 ${hasCV ? "text-green-400" : "text-slate-500"}`}>
                        {hasCV ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} CV
                      </span>
                      <span className={`flex items-center gap-1 ${hasCL ? "text-green-400" : "text-slate-500"}`}>
                        {hasCL ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} Cover Letter
                      </span>
                      {job.application?.screenshotUrl && (
                        <button
                          onClick={() => setScreenshot(job.application!.screenshotUrl)}
                          className="flex items-center gap-1 text-brand-400 hover:text-brand-300"
                        >
                          <Eye size={12} /> View fill
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!ready && (
                      <Link href={`/jobs/${job.id}`} className="btn-secondary !py-2 !px-4 text-sm">
                        Prepare docs
                      </Link>
                    )}
                    <button
                      onClick={() => autoApply(job.id)}
                      disabled={applyingId === job.id}
                      className="btn-primary !py-2 !px-4 text-sm"
                    >
                      {applyingId === job.id ? <LoadingSpinner /> : <Zap size={16} />}
                      Auto-Fill
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Screenshot modal */}
      {screenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setScreenshot(null)}
        >
          <motion.img
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={screenshot}
            alt="Application fill screenshot"
            className="max-w-4xl w-full max-h-[90vh] object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
