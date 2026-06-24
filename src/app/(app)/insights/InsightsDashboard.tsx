"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  FileText,
  Mail,
  Inbox,
  Lightbulb,
  Award,
} from "lucide-react";
import { ATSScoreRing } from "@/components/ui/ATSScore";
import { SkeletonCard } from "@/components/ui/Loading";

interface ProfileSection {
  key: string;
  label: string;
  weight: number;
  score: number;
  complete: boolean;
  tip?: string;
}
interface ProfileScore {
  score: number;
  tier: string;
  sections: ProfileSection[];
  suggestions: string[];
  strengths: string[];
}
interface Funnel {
  total: number;
  saved: number;
  applied: number;
  interview: number;
  offers: number;
  rejected: number;
  withdrawn: number;
  active: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  avgAtsScore: number;
}
interface RoleFit {
  id: string;
  label: string;
  fitScore: number;
  matched: string[];
  missing: string[];
  recommended: boolean;
}
interface InsightsData {
  profileScore: ProfileScore;
  funnel: Funnel;
  roleFit: RoleFit[];
  counts: { cvs: number; coverLetters: number; employerEmails: number };
}

function fitColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 45) return "#eab308";
  if (score >= 25) return "#f97316";
  return "#ef4444";
}

export function InsightsDashboard() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Career Insights</h1>
          <p className="text-slate-400 mt-1">Loading your career intelligence…</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold text-white">Career Insights</h1>
        <p className="text-slate-400 mt-2">Couldn&apos;t load insights. Please try again.</p>
      </div>
    );
  }

  const { profileScore, funnel, roleFit, counts } = data;
  const topRole = roleFit[0];

  const funnelStages = [
    { label: "Saved", value: funnel.saved + funnel.applied, color: "from-slate-500 to-slate-600" },
    { label: "Applied", value: funnel.applied, color: "from-blue-500 to-blue-600" },
    { label: "Interview", value: funnel.interview, color: "from-purple-500 to-purple-600" },
    { label: "Offer", value: funnel.offers, color: "from-green-500 to-emerald-600" },
  ];
  const funnelMax = Math.max(1, ...funnelStages.map((s) => s.value));

  return (
    <div className="max-w-6xl pb-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-brand-400" /> Career Insights
          </h1>
          <p className="text-slate-400 mt-1">
            Your profile strength, application performance and best-fit roles.
          </p>
        </div>
        <Link href="/profile" className="btn-primary">
          <Target size={18} /> Improve Profile
        </Link>
      </div>

      {/* Top row: profile score + funnel summary + role fit */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Profile score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex flex-col items-center text-center"
        >
          <h2 className="text-sm font-semibold text-slate-300 mb-4 self-start flex items-center gap-2">
            <Award size={16} className="text-brand-400" /> Profile Score
          </h2>
          <ATSScoreRing score={profileScore.score} size={140} showLabel={false} />
          <div className="-mt-[88px] mb-[48px] flex flex-col items-center">
            <span className="text-4xl font-bold text-white">{profileScore.score}</span>
            <span className="text-xs text-slate-400">{profileScore.tier}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {profileScore.strengths.length} of {profileScore.sections.length} sections complete
          </p>
        </motion.div>

        {/* Application performance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-6"
        >
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-400" /> Application Performance
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Applied" value={funnel.applied} />
            <Metric label="Active" value={funnel.active} />
            <Metric label="Response rate" value={`${funnel.responseRate}%`} />
            <Metric label="Interview rate" value={`${funnel.interviewRate}%`} />
            <Metric label="Offers" value={funnel.offers} accent />
            <Metric label="Avg ATS" value={funnel.avgAtsScore ? `${funnel.avgAtsScore}%` : "—"} />
          </div>
        </motion.div>

        {/* Best-fit role */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Target size={16} className="text-brand-400" /> Best-Fit Role
          </h2>
          {topRole ? (
            <div>
              <p className="text-xl font-bold text-white">{topRole.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold" style={{ color: fitColor(topRole.fitScore) }}>
                  {topRole.fitScore}%
                </span>
                <span className="text-xs text-slate-500">skill match</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: fitColor(topRole.fitScore) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${topRole.fitScore}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              {topRole.missing.length > 0 && (
                <p className="text-xs text-slate-500 mt-3">
                  Close the gap: <span className="text-slate-300">{topRole.missing.slice(0, 4).join(", ")}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Add skills to your profile to see role fit.</p>
          )}
        </motion.div>
      </div>

      {/* Funnel + section breakdown */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Funnel bars */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Inbox size={18} className="text-brand-400" /> Application Funnel
          </h2>
          <div className="space-y-4">
            {funnelStages.map((stage, i) => (
              <div key={stage.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-300">{stage.label}</span>
                  <span className="text-slate-400 font-medium">{stage.value}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${stage.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(stage.value / funnelMax) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.08 }}
                  />
                </div>
              </div>
            ))}
          </div>
          {funnel.total === 0 && (
            <p className="text-sm text-slate-500 mt-4">
              No applications yet.{" "}
              <Link href="/jobs" className="text-brand-400 hover:underline">
                Add a job
              </Link>{" "}
              to start tracking.
            </p>
          )}
        </motion.div>

        {/* Profile section breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Award size={18} className="text-brand-400" /> Profile Breakdown
          </h2>
          <div className="space-y-2.5">
            {profileScore.sections.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                {s.complete ? (
                  <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-amber-400 shrink-0" />
                )}
                <span className="text-sm text-slate-300 w-40 shrink-0">{s.label}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${s.complete ? "bg-green-500" : "bg-amber-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.score / s.weight) * 100}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-10 text-right">
                  {s.score}/{s.weight}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Suggestions */}
      {profileScore.suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb size={18} className="text-brand-400" /> Recommended Next Steps
          </h2>
          <ul className="space-y-2">
            {profileScore.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Role fit grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 mb-6"
      >
        <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <Target size={18} className="text-brand-400" /> Role Fit Analysis
        </h2>
        <p className="text-sm text-slate-400 mb-5">
          How your current skills match common engineering roles. Use this to pick targets and close gaps.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roleFit.map((role) => (
            <div
              key={role.id}
              className={`p-4 rounded-xl border ${
                role.recommended
                  ? "border-brand-500/40 bg-brand-500/5"
                  : "border-slate-700 bg-slate-800/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-white text-sm">{role.label}</p>
                {role.recommended && (
                  <span className="badge bg-brand-500/20 text-brand-300 text-[10px]">Recommended</span>
                )}
              </div>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="text-2xl font-bold" style={{ color: fitColor(role.fitScore) }}>
                  {role.fitScore}%
                </span>
                <span className="text-xs text-slate-500 mb-1">
                  {role.matched.length}/{role.matched.length + role.missing.length} skills
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-3">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: fitColor(role.fitScore) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${role.fitScore}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
              {role.missing.length > 0 && (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Gaps: {role.missing.slice(0, 5).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Asset counts */}
      <div className="grid grid-cols-3 gap-4">
        <CountCard icon={FileText} label="CVs generated" value={counts.cvs} href="/cv" />
        <CountCard icon={Mail} label="Cover letters" value={counts.coverLetters} href="/cover-letters" />
        <CountCard icon={Inbox} label="Employer emails" value={counts.employerEmails} href="/applications" />
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
      <p className={`text-xl font-bold ${accent ? "text-green-400" : "text-white"}`}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function CountCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="glass-card p-5 hover:border-brand-500/40 transition-colors group">
      <div className="flex items-center justify-between">
        <Icon size={20} className="text-brand-400" />
        <ArrowUpRight size={16} className="text-slate-600 group-hover:text-brand-400 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-white mt-3">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </Link>
  );
}
