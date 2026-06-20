"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User,
  Briefcase,
  FileText,
  Mail,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Target,
  Sparkles,
} from "lucide-react";
import { ATSScoreRing } from "@/components/ui/ATSScore";
import { SkeletonCard } from "@/components/ui/Loading";

interface DashboardStats {
  profileComplete: number;
  totalJobs: number;
  totalCVs: number;
  totalCoverLetters: number;
  avgAtsScore: number;
  recentJobs: Array<{
    id: string;
    title: string;
    company: string;
    atsScore: number | null;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [profileRes, jobsRes, cvsRes, lettersRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/jobs"),
          fetch("/api/cv/generate"),
          fetch("/api/cover-letter/generate"),
        ]);

        const profile = await profileRes.json();
        const jobs = await jobsRes.json();
        const cvs = await cvsRes.json();
        const letters = await lettersRes.json();

        // Calculate profile completeness
        const fields = [
          profile.fullName, profile.email, profile.phone, profile.location,
          profile.summary,
          Array.isArray(profile.experience) && profile.experience.length > 0,
          Array.isArray(profile.education) && profile.education.length > 0,
          Array.isArray(profile.skills) && profile.skills.length > 0,
        ];
        const profileComplete = Math.round((fields.filter(Boolean).length / fields.length) * 100);

        const jobsArr = Array.isArray(jobs) ? jobs : [];
        const scores = jobsArr.filter((j) => j.atsScore).map((j) => j.atsScore);
        const avgAtsScore = scores.length
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : 0;

        setStats({
          profileComplete,
          totalJobs: jobsArr.length,
          totalCVs: Array.isArray(cvs) ? cvs.length : 0,
          totalCoverLetters: Array.isArray(letters) ? letters.length : 0,
          avgAtsScore,
          recentJobs: jobsArr.slice(0, 5),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const statCards = [
    { label: "Profile Complete", value: `${stats?.profileComplete ?? 0}%`, icon: User, href: "/profile", color: "from-blue-500 to-blue-700" },
    { label: "Saved Jobs", value: stats?.totalJobs ?? 0, icon: Briefcase, href: "/jobs", color: "from-purple-500 to-purple-700" },
    { label: "Generated CVs", value: stats?.totalCVs ?? 0, icon: FileText, href: "/cv", color: "from-green-500 to-green-700" },
    { label: "Cover Letters", value: stats?.totalCoverLetters ?? 0, icon: Mail, href: "/cover-letters", color: "from-orange-500 to-orange-700" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back — here&apos;s your job search overview</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          <Plus size={18} /> Add Job
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={card.href}>
                <div className="glass-card p-5 hover:border-brand-500/30 transition-all group cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${card.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div className="text-2xl font-bold text-white">{loading ? "—" : card.value}</div>
                  <div className="text-sm text-slate-500 mt-1">{card.label}</div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent jobs */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Briefcase size={18} className="text-brand-400" /> Recent Jobs
              </h2>
              <Link href="/jobs" className="text-sm text-brand-400 hover:text-brand-300">
                View all
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : stats?.recentJobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">No jobs added yet</p>
                <Link href="/jobs/new" className="btn-primary !py-2 !px-4 text-sm">
                  <Plus size={16} /> Add your first job
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {stats?.recentJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{job.title}</p>
                        <p className="text-sm text-slate-500 truncate">{job.company}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="badge bg-slate-800 text-slate-400 capitalize">
                          {job.status.toLowerCase()}
                        </span>
                        {job.atsScore != null && <ATSScoreRing score={job.atsScore} size={48} />}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          {/* Avg ATS Score */}
          <div className="glass-card p-6 text-center">
            <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center justify-center gap-2">
              <Target size={16} /> Avg ATS Match
            </h3>
            <div className="flex justify-center">
              <ATSScoreRing score={stats?.avgAtsScore ?? 0} size={120} />
            </div>
            <p className="text-xs text-slate-500 mt-4">Across all your applications</p>
          </div>

          {/* Quick actions */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
              <Sparkles size={16} /> Quick Actions
            </h3>
            <div className="space-y-2">
              <Link href="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-slate-300">
                <User size={16} className="text-brand-400" /> Update Profile
              </Link>
              <Link href="/jobs/new" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-slate-300">
                <Plus size={16} className="text-brand-400" /> Add Job from URL
              </Link>
              <Link href="/apply" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-slate-300">
                <TrendingUp size={16} className="text-brand-400" /> Auto-Apply
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
