/**
 * Career insights — deterministic, zero-cost analytics derived from the data
 * the platform already stores (Profile + Jobs + applications). No AI calls,
 * no extra DB fields: everything is computed on the fly so it stays accurate.
 *
 * Three pillars (Phase 3 of the platform plan):
 *   1. Profile score      — completeness + quality, with actionable fixes
 *   2. Application funnel  — saved → applied → interview → offer, with rates
 *   3. Role fit            — which target roles the profile matches best
 */

import type { ProfileData } from "@/services/ai.service";

// ─── Shared skill normalisation ────────────────────────────────────────────

const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  "node": "node.js",
  nodejs: "node.js",
  "next": "next.js",
  nextjs: "next.js",
  golang: "go",
  k8s: "kubernetes",
  postgres: "postgresql",
  "google cloud": "gcp",
  ml: "machine learning",
};

export function normalizeSkill(s: string): string {
  const k = (s || "").trim().toLowerCase();
  return SKILL_ALIASES[k] ?? k;
}

/** Collect the user's skill signal from skills + experience tech + titles. */
export function profileSkillSet(profile: ProfileData): Set<string> {
  const tokens: string[] = [
    ...(profile.skills || []),
    ...(profile.experience || []).flatMap((e) => [
      ...(e.technologies || []),
      e.title || "",
    ]),
    ...(profile.projects || []).flatMap((p) => p.technologies || []),
  ];
  return new Set(tokens.map(normalizeSkill).filter(Boolean));
}

function hasSkill(set: Set<string>, want: string): boolean {
  const w = normalizeSkill(want);
  if (set.has(w)) return true;
  // partial containment both ways (e.g. "aws" inside "aws lambda")
  for (const s of set) {
    if (s.includes(w) || w.includes(s)) return true;
  }
  return false;
}

// ─── 1. Profile score ──────────────────────────────────────────────────────

export interface ProfileSection {
  key: string;
  label: string;
  weight: number;
  score: number; // 0..weight
  complete: boolean;
  tip?: string;
}

export interface ProfileScore {
  score: number; // 0..100
  tier: "Low" | "Fair" | "Good" | "Excellent";
  sections: ProfileSection[];
  suggestions: string[];
  strengths: string[];
}

function tierFor(score: number): ProfileScore["tier"] {
  if (score >= 85) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 40) return "Fair";
  return "Low";
}

export function computeProfileScore(profile: ProfileData | null): ProfileScore {
  const p = profile || {};
  const exp = p.experience || [];
  const edu = p.education || [];
  const skills = p.skills || [];
  const certs = p.certifications || [];
  const projects = p.projects || [];

  const contactFilled = [p.fullName, p.email, p.phone, p.location].filter(Boolean).length;
  const links = [p.linkedin, p.github, p.website].filter(Boolean).length;
  const expWithAchievements = exp.filter(
    (e) => (e.achievements && e.achievements.length > 0) || (e.description && e.description.length > 40)
  ).length;

  const sections: ProfileSection[] = [
    {
      key: "contact",
      label: "Contact details",
      weight: 15,
      score: Math.round((contactFilled / 4) * 15),
      complete: contactFilled === 4,
      tip: contactFilled < 4 ? "Add your full name, email, phone and location." : undefined,
    },
    {
      key: "summary",
      label: "Professional summary",
      weight: 15,
      score: p.summary ? (p.summary.length >= 120 ? 15 : 9) : 0,
      complete: Boolean(p.summary && p.summary.length >= 120),
      tip: !p.summary
        ? "Write a 2–3 sentence summary tailored to your target role."
        : p.summary.length < 120
        ? "Expand your summary to ~120+ characters with measurable impact."
        : undefined,
    },
    {
      key: "experience",
      label: "Work experience",
      weight: 25,
      score: exp.length === 0 ? 0 : Math.min(25, 12 + Math.round((expWithAchievements / exp.length) * 13)),
      complete: exp.length > 0 && expWithAchievements === exp.length,
      tip:
        exp.length === 0
          ? "Add at least one role with quantified achievements."
          : expWithAchievements < exp.length
          ? "Add measurable achievement bullets to every role."
          : undefined,
    },
    {
      key: "skills",
      label: "Skills",
      weight: 15,
      score: Math.min(15, Math.round((skills.length / 8) * 15)),
      complete: skills.length >= 8,
      tip: skills.length < 8 ? "List at least 8 relevant skills (aim for the keywords in your target jobs)." : undefined,
    },
    {
      key: "education",
      label: "Education",
      weight: 10,
      score: edu.length > 0 ? 10 : 0,
      complete: edu.length > 0,
      tip: edu.length === 0 ? "Add your degree or relevant qualification." : undefined,
    },
    {
      key: "certifications",
      label: "Certifications",
      weight: 8,
      score: certs.length > 0 ? 8 : 0,
      complete: certs.length > 0,
      tip: certs.length === 0 ? "Add certifications (e.g. AWS, Azure, Scrum) to stand out." : undefined,
    },
    {
      key: "projects",
      label: "Projects",
      weight: 7,
      score: projects.length > 0 ? 7 : 0,
      complete: projects.length > 0,
      tip: projects.length === 0 ? "Showcase 1–2 projects with the tech you used." : undefined,
    },
    {
      key: "links",
      label: "Professional links",
      weight: 5,
      score: Math.min(5, links * 2 + (links > 0 ? 1 : 0)),
      complete: links >= 2,
      tip: links < 2 ? "Add LinkedIn and GitHub/website links." : undefined,
    },
  ];

  const score = Math.min(100, sections.reduce((sum, s) => sum + s.score, 0));
  const suggestions = sections.filter((s) => s.tip).map((s) => s.tip as string);
  const strengths = sections.filter((s) => s.complete).map((s) => s.label);

  return { score, tier: tierFor(score), sections, suggestions, strengths };
}

// ─── 2. Application funnel ──────────────────────────────────────────────────

export type JobStatusLike =
  | "SAVED"
  | "APPLIED"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export interface FunnelJob {
  status: JobStatusLike | string;
  atsScore?: number | null;
  appliedAt?: string | Date | null;
  createdAt?: string | Date | null;
}

export interface ApplicationFunnel {
  total: number;
  saved: number;
  applied: number; // reached APPLIED or beyond
  interview: number; // reached INTERVIEW or beyond
  offers: number;
  rejected: number;
  withdrawn: number;
  active: number; // applied/interview, not yet resolved
  responseRate: number; // any employer response / applied (%)
  interviewRate: number; // reached interview / applied (%)
  offerRate: number; // offers / applied (%)
  avgAtsScore: number;
  byStatus: Record<string, number>;
}

const REACHED_APPLIED = new Set(["APPLIED", "INTERVIEW", "OFFER", "REJECTED"]);
const REACHED_INTERVIEW = new Set(["INTERVIEW", "OFFER"]);

export function computeApplicationFunnel(jobs: FunnelJob[]): ApplicationFunnel {
  const byStatus: Record<string, number> = {};
  for (const j of jobs) {
    const s = String(j.status || "SAVED");
    byStatus[s] = (byStatus[s] || 0) + 1;
  }

  const saved = byStatus["SAVED"] || 0;
  const offers = byStatus["OFFER"] || 0;
  const rejected = byStatus["REJECTED"] || 0;
  const withdrawn = byStatus["WITHDRAWN"] || 0;
  const applied = jobs.filter((j) => REACHED_APPLIED.has(String(j.status))).length;
  const interview = jobs.filter((j) => REACHED_INTERVIEW.has(String(j.status))).length;
  const active = (byStatus["APPLIED"] || 0) + (byStatus["INTERVIEW"] || 0);

  const responses = interview + rejected; // employer moved it forward or closed it
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const scored = jobs.map((j) => j.atsScore || 0).filter((n) => n > 0);
  const avgAtsScore = scored.length
    ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
    : 0;

  return {
    total: jobs.length,
    saved,
    applied,
    interview,
    offers,
    rejected,
    withdrawn,
    active,
    responseRate: pct(responses, applied),
    interviewRate: pct(interview, applied),
    offerRate: pct(offers, applied),
    avgAtsScore,
    byStatus,
  };
}

// ─── 3. Role fit ────────────────────────────────────────────────────────────

interface RoleProfile {
  id: string;
  label: string;
  core: string[]; // skills that drive the fit score
}

const ROLE_PROFILES: RoleProfile[] = [
  {
    id: "solution-architect",
    label: "Solution Architect",
    core: [
      "system design", "microservices", "cloud architecture", "aws", "azure", "gcp",
      "kubernetes", "docker", "terraform", "api", "security", "domain-driven design",
      "ci/cd", "scalability",
    ],
  },
  {
    id: "software-engineer",
    label: "Software Engineer",
    core: [
      "typescript", "javascript", "python", "java", "go", "react", "node.js",
      "rest", "graphql", "sql", "git", "testing", "docker",
    ],
  },
  {
    id: "backend-engineer",
    label: "Backend Engineer",
    core: [
      "node.js", "python", "java", "go", "postgresql", "mongodb", "redis", "kafka",
      "rest", "graphql", "microservices", "docker", "sql",
    ],
  },
  {
    id: "frontend-engineer",
    label: "Frontend Engineer",
    core: [
      "react", "next.js", "typescript", "javascript", "css", "tailwind", "vue",
      "angular", "accessibility", "ui/ux", "testing", "html",
    ],
  },
  {
    id: "devops-engineer",
    label: "DevOps / Platform Engineer",
    core: [
      "kubernetes", "docker", "terraform", "aws", "azure", "gcp", "ci/cd",
      "jenkins", "github actions", "ansible", "linux", "bash",
    ],
  },
  {
    id: "data-engineer",
    label: "Data Engineer",
    core: [
      "python", "sql", "spark", "hadoop", "kafka", "airflow", "pandas",
      "postgresql", "etl", "data analysis", "aws",
    ],
  },
];

export interface RoleFit {
  id: string;
  label: string;
  fitScore: number; // 0..100
  matched: string[];
  missing: string[];
  recommended: boolean;
}

function prettyLabel(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function computeRoleFit(profile: ProfileData | null): RoleFit[] {
  const set = profileSkillSet(profile || {});

  const fits = ROLE_PROFILES.map((role) => {
    const matched: string[] = [];
    const missing: string[] = [];
    for (const skill of role.core) {
      if (hasSkill(set, skill)) matched.push(prettyLabel(skill));
      else missing.push(prettyLabel(skill));
    }
    const fitScore = Math.round((matched.length / role.core.length) * 100);
    return { id: role.id, label: role.label, fitScore, matched, missing, recommended: false };
  }).sort((a, b) => b.fitScore - a.fitScore);

  // Mark the top role (and any within 5 points of it) as recommended.
  if (fits.length && fits[0].fitScore > 0) {
    const top = fits[0].fitScore;
    for (const f of fits) f.recommended = f.fitScore >= top - 5 && f.fitScore > 0;
  }
  return fits;
}
