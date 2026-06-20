"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, Plus, MapPin, Building2, ExternalLink } from "lucide-react";
import { ScoreBadge } from "@/components/ui/ATSScore";
import { SkeletonCard } from "@/components/ui/Loading";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  jobType: string | null;
  portalName: string | null;
  atsScore: number | null;
  status: string;
  createdAt: string;
  cvDocuments?: unknown[];
  coverLetters?: unknown[];
}

const statusColors: Record<string, string> = {
  SAVED: "bg-slate-700 text-slate-300",
  APPLIED: "bg-blue-600/20 text-blue-400",
  INTERVIEW: "bg-purple-600/20 text-purple-400",
  OFFER: "bg-green-600/20 text-green-400",
  REJECTED: "bg-red-600/20 text-red-400",
  WITHDRAWN: "bg-slate-700 text-slate-400",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/jobs");
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter);
  const filters = ["ALL", "SAVED", "APPLIED", "INTERVIEW", "OFFER"];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Job Tracker</h1>
          <p className="text-slate-400 mt-1">Manage your applications and ATS scores</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          <Plus size={18} /> Add Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? "bg-brand-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            {f !== "ALL" && (
              <span className="ml-2 opacity-60">
                {jobs.filter((j) => j.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No jobs yet</h3>
          <p className="text-slate-400 mb-6">Add a job to start generating tailored CVs</p>
          <Link href="/jobs/new" className="btn-primary">
            <Plus size={18} /> Add Your First Job
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link href={`/jobs/${job.id}`}>
                <div className="glass-card p-5 hover:border-brand-500/30 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white truncate group-hover:text-brand-300 transition-colors">
                          {job.title}
                        </h3>
                        <span className={`badge ${statusColors[job.status]} capitalize`}>
                          {job.status.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Building2 size={14} /> {job.company}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} /> {job.location}
                          </span>
                        )}
                        {job.portalName && (
                          <span className="flex items-center gap-1.5">
                            <ExternalLink size={14} /> {job.portalName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {job.atsScore != null && <ScoreBadge score={job.atsScore} />}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
