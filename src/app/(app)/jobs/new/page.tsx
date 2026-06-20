"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Link2, FileText, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/Loading";

export default function NewJobPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (mode === "url" && !url.trim()) {
      toast.error("Enter a job URL");
      return;
    }
    if (mode === "text" && !text.trim()) {
      toast.error("Paste the job description");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("AI is analyzing the job & scoring your match...");

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "url" ? { url } : { text }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Job added & analyzed!", { id: toastId });
        router.push(`/jobs/${data.job.id}`);
      } else {
        toast.error(data.error || "Failed to add job", { id: toastId });
        setLoading(false);
      }
    } catch {
      toast.error("Failed to add job", { id: toastId });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/jobs" className="btn-ghost mb-6 !px-0">
        <ArrowLeft size={16} /> Back to jobs
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Add a Job</h1>
        <p className="text-slate-400 mt-1">
          Paste a link or description — AI extracts requirements & scores your match
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6 p-1 bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setMode("url")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "url" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <Link2 size={16} /> From URL
        </button>
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "text" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText size={16} /> Paste Text
        </button>
      </div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        {mode === "url" ? (
          <div>
            <label className="label">Job Posting URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://linkedin.com/jobs/view/..."
              className="input"
            />
            <p className="text-xs text-slate-500 mt-2">
              Supports LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday & more
            </p>
          </div>
        ) : (
          <div>
            <label className="label">Job Description</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full job description here..."
              className="input min-h-[240px] resize-y"
            />
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full mt-5">
          {loading ? <LoadingSpinner /> : <Sparkles size={18} />}
          {loading ? "Analyzing..." : "Analyze & Add Job"}
        </button>
      </motion.div>

      <div className="glass-card p-5 mt-4 bg-brand-600/5 border-brand-500/20">
        <p className="text-sm text-slate-400">
          <Sparkles size={14} className="inline text-brand-400 mr-1" />
          After adding, you can generate a tailored CV, cover letter, and even auto-fill the
          application form.
        </p>
      </div>
    </div>
  );
}
