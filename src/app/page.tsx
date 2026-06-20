"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  FileText,
  Briefcase,
  Zap,
  Upload,
  Target,
  Mail,
  ArrowRight,
  Link2,
  Bot,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Multi-Source Import",
    desc: "Aggregate your profile from LinkedIn, Monster, uploaded PDFs, Word docs, or manual entry — all in one place.",
  },
  {
    icon: Target,
    title: "ATS Optimization",
    desc: "AI scores your match against each job and tailors your CV to beat applicant tracking systems.",
  },
  {
    icon: FileText,
    title: "Tailored CVs",
    desc: "Generate job-specific CVs that emphasize your most relevant experience and keywords automatically.",
  },
  {
    icon: Mail,
    title: "Cover Letters",
    desc: "Compelling, personalized cover letters in multiple tones — generated in seconds for every application.",
  },
  {
    icon: Zap,
    title: "Auto-Fill Applications",
    desc: "Paste a job portal link and let AI fill the application form. You just verify and submit.",
  },
  {
    icon: Bot,
    title: "Powered by Gemini + Copilot",
    desc: "Best-in-class AI models do the heavy lifting of writing, matching, and optimizing.",
  },
];

const steps = [
  { num: "01", title: "Build Your Profile", desc: "Import from any source — we merge everything into one master profile." },
  { num: "02", title: "Add a Job", desc: "Paste a job URL or description. AI analyzes the requirements." },
  { num: "03", title: "Generate & Apply", desc: "Get a tailored CV + cover letter, then auto-fill the application." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">CV Creator</span>
        </div>
        <Link href="/dashboard" className="btn-primary !py-2.5 !px-5 text-sm">
          Launch App <ArrowRight size={16} />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-600/10 border border-brand-500/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-sm text-brand-300 font-medium">AI-Powered Job Application Suite</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight">
            Land your dream job
            <br />
            <span className="gradient-text">on autopilot</span>
          </h1>

          <p className="mt-6 text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto">
            Aggregate your profile from anywhere. Generate tailored CVs and cover letters for every
            job. Auto-fill applications. You just verify and submit.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary text-base !px-8 !py-4">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <Link href="/profile" className="btn-secondary text-base !px-8 !py-4">
              <Link2 size={18} /> Import Profile
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-green-400" /> No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-green-400" /> ATS-optimized
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-green-400" /> Human-verified submission
            </span>
          </div>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="glass-card p-6 hover:border-brand-500/30 transition-colors group"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-brand-600/20 mb-4 group-hover:bg-brand-600/30 transition-colors">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl lg:text-4xl font-bold text-white text-center mb-4">How it works</h2>
        <p className="text-slate-400 text-center mb-12">Three steps from profile to submitted application</p>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative"
            >
              <div className="glass-card p-6 h-full">
                <span className="text-4xl font-extrabold text-brand-500/30">{step.num}</span>
                <h3 className="text-xl font-semibold text-white mt-2 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="glass-card p-10 lg:p-14 text-center bg-gradient-to-br from-brand-600/10 to-purple-600/10 border-brand-500/20">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to supercharge your job search?
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Build your profile once. Apply everywhere. Let AI do the tedious work.
          </p>
          <Link href="/dashboard" className="btn-primary text-base !px-8 !py-4">
            Start Building <Sparkles size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-slate-500">
          <span>© 2026 CV Creator. Built with AI.</span>
          <span>Powered by Gemini Pro & GitHub Copilot</span>
        </div>
      </footer>
    </div>
  );
}
