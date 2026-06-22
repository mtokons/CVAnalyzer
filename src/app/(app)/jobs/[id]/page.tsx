"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  MapPin,
  FileText,
  Mail,
  Zap,
  Sparkles,
  CheckCircle2,
  XCircle,
  Target,
  ExternalLink,
  Trash2,
  Download,
  Eye,
} from "lucide-react";
import { ATSScoreRing } from "@/components/ui/ATSScore";
import { LoadingSpinner } from "@/components/ui/Loading";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  jobType: string | null;
  salary: string | null;
  description: string;
  requirements: string[];
  keywords: string[];
  matchedSkills: string[];
  missingSkills: string[];
  portalName: string | null;
  portalUrl: string | null;
  applicationUrl: string | null;
  atsScore: number | null;
  status: string;
  cvDocuments: Array<{ id: string; title: string; htmlContent: string; createdAt: string }>;
  coverLetters: Array<{ id: string; title: string; content: string; tone: string; createdAt: string }>;
  application: { id: string; fillStatus: string; screenshotUrl: string | null } | null;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCV, setGeneratingCV] = useState(false);
  const [generatingCL, setGeneratingCL] = useState(false);
  const [applying, setApplying] = useState(false);
  const [tone, setTone] = useState("professional");
  const [template, setTemplate] = useState("modern");
  const [previewCV, setPreviewCV] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      setJob(data);
    } catch {
      toast.error("Failed to load job");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const generateCV = async () => {
    setGeneratingCV(true);
    const toastId = toast.loading("AI is crafting your tailored CV...");
    try {
      const res = await fetch("/api/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, template }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`CV generated! ATS score: ${data.atsScore}%`, { id: toastId });
        loadJob();
      } else {
        toast.error(data.error || "Generation failed", { id: toastId });
      }
    } catch {
      toast.error("Generation failed", { id: toastId });
    } finally {
      setGeneratingCV(false);
    }
  };

  const generateCoverLetter = async () => {
    setGeneratingCL(true);
    const toastId = toast.loading("Writing your cover letter...");
    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, tone }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cover letter generated!", { id: toastId });
        loadJob();
      } else {
        toast.error(data.error || "Generation failed", { id: toastId });
      }
    } catch {
      toast.error("Generation failed", { id: toastId });
    } finally {
      setGeneratingCL(false);
    }
  };

  const autoApply = async () => {
    if (!job?.applicationUrl && !job?.portalUrl) {
      toast.error("No application URL available for this job");
      return;
    }
    setApplying(true);
    const toastId = toast.loading("Launching browser & filling application...");
    try {
      const res = await fetch("/api/automation/fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Filled ${data.filledFields}/${data.totalFields} fields. Review in the browser!`,
          { id: toastId, duration: 6000 }
        );
        loadJob();
      } else {
        toast.error(data.message || data.error || "Automation failed", { id: toastId });
      }
    } catch {
      toast.error("Automation failed", { id: toastId });
    } finally {
      setApplying(false);
    }
  };

  const deleteJob = async () => {
    if (!confirm("Delete this job and all associated CVs/cover letters?")) return;
    await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    toast.success("Job deleted");
    router.push("/jobs");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size={32} className="text-brand-500" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Job not found</p>
        <Link href="/jobs" className="btn-secondary mt-4 inline-flex">
          Back to jobs
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/jobs" className="btn-ghost mb-6 !px-0">
        <ArrowLeft size={16} /> Back to jobs
      </Link>

      {/* Header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">{job.title}</h1>
            <div className="flex items-center gap-4 text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Building2 size={16} /> {job.company}
              </span>
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} /> {job.location}
                </span>
              )}
              {job.jobType && <span className="badge bg-slate-800 text-slate-300">{job.jobType}</span>}
              {job.salary && <span className="text-green-400 text-sm">{job.salary}</span>}
            </div>
            {job.portalUrl && (
              <a
                href={job.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 mt-3"
              >
                <ExternalLink size={14} /> View original posting ({job.portalName})
              </a>
            )}
          </div>
          <div className="flex items-center gap-4">
            {job.atsScore != null && <ATSScoreRing score={job.atsScore} size={88} />}
            <button onClick={deleteJob} className="btn-ghost text-red-400 hover:bg-red-500/10">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Actions & generated docs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Generate CV */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText size={18} className="text-brand-400" /> Tailored CV
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="input !py-2 !px-3 text-sm bg-slate-800 border-slate-700"
                  aria-label="CV template"
                >
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                </select>
                <button onClick={generateCV} disabled={generatingCV} className="btn-primary !py-2 !px-4 text-sm">
                  {generatingCV ? <LoadingSpinner /> : <Sparkles size={16} />}
                  {job.cvDocuments.length > 0 ? "Regenerate" : "Generate CV"}
                </button>
              </div>
            </div>
            {job.cvDocuments.length === 0 ? (
              <p className="text-sm text-slate-500">
                Generate an ATS-optimized CV tailored specifically to this role.
              </p>
            ) : (
              <div className="space-y-2">
                {job.cvDocuments.map((cv) => (
                  <div
                    key={cv.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700"
                  >
                    <span className="text-sm text-white truncate">{cv.title}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewCV(cv.htmlContent)}
                        className="btn-ghost !p-2"
                        title="Preview"
                      >
                        <Eye size={16} />
                      </button>
                      <a
                        href={`/api/cv/${cv.id}/pdf`}
                        className="btn-ghost !p-2 flex items-center"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate Cover Letter */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Mail size={18} className="text-brand-400" /> Cover Letter
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="professional">Professional</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="formal">Formal</option>
                  <option value="creative">Creative</option>
                </select>
                <button onClick={generateCoverLetter} disabled={generatingCL} className="btn-primary !py-2 !px-4 text-sm">
                  {generatingCL ? <LoadingSpinner /> : <Sparkles size={16} />}
                  Generate
                </button>
              </div>
            </div>
            {job.coverLetters.length === 0 ? (
              <p className="text-sm text-slate-500">
                Generate a compelling, personalized cover letter for this position.
              </p>
            ) : (
              <div className="space-y-3">
                {job.coverLetters.map((cl) => (
                  <div key={cl.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="badge bg-brand-600/20 text-brand-300 capitalize">{cl.tone}</span>
                    </div>
                    <div
                      className="text-sm text-slate-300 prose prose-invert prose-sm max-w-none line-clamp-6"
                      dangerouslySetInnerHTML={{ __html: cl.content }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auto-apply */}
          <div className="glass-card p-6 bg-gradient-to-br from-brand-600/10 to-purple-600/10 border-brand-500/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap size={18} className="text-brand-400" /> Auto-Fill Application
              </h2>
              <button
                onClick={autoApply}
                disabled={applying || (!job.applicationUrl && !job.portalUrl)}
                className="btn-primary !py-2 !px-4 text-sm"
              >
                {applying ? <LoadingSpinner /> : <Zap size={16} />}
                Auto-Apply
              </button>
            </div>
            <p className="text-sm text-slate-400">
              AI opens the application portal and fills in your details. A browser window opens for
              you to <strong className="text-white">verify and submit manually</strong>.
            </p>
            {job.application && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="badge bg-slate-800 text-slate-300">
                  Status: {job.application.fillStatus.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: ATS analysis */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
              <Target size={16} /> Skill Match
            </h3>

            {job.matchedSkills.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-green-400 mb-2 font-medium">Matched ({job.matchedSkills.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.matchedSkills.map((s, i) => (
                    <span key={i} className="badge bg-green-500/15 text-green-400 flex items-center gap-1">
                      <CheckCircle2 size={11} /> {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.missingSkills.length > 0 && (
              <div>
                <p className="text-xs text-orange-400 mb-2 font-medium">Gaps ({job.missingSkills.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.missingSkills.map((s, i) => (
                    <span key={i} className="badge bg-orange-500/15 text-orange-400 flex items-center gap-1">
                      <XCircle size={11} /> {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Requirements */}
          {job.requirements.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Key Requirements</h3>
              <ul className="space-y-2">
                {job.requirements.slice(0, 8).map((req, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-brand-400 mt-1">•</span> {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* CV Preview Modal */}
      {previewCV && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPreviewCV(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe srcDoc={previewCV} className="w-full h-[85vh] rounded-2xl" title="CV Preview" />
          </motion.div>
        </div>
      )}
    </div>
  );
}
