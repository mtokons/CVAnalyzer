/**
 * AI Fallback Provider
 *
 * Deterministic, dependency-free heuristics used when no live AI key
 * (GEMINI_API_KEY) is configured. This keeps the full product pipeline —
 * profile extraction, job analysis, ATS scoring, CV & cover-letter
 * generation — fully functional and end-to-end testable in local/dev
 * environments. When a real key is present, the live model is used instead.
 */

import type {
  ProfileData,
  JobDetails,
  WorkExperience,
  Education,
} from "./ai.service";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_RE = /(https?:\/\/)?(www\.)?linkedin\.com\/[^\s)]+/i;
const GITHUB_RE = /(https?:\/\/)?(www\.)?github\.com\/[^\s)]+/i;
const URL_RE = /https?:\/\/[^\s)]+/i;

/** A curated keyword bank used to detect skills/keywords in free text. */
const SKILL_BANK = [
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "golang",
  "rust", "ruby", "php", "swift", "kotlin", "scala", "react", "next.js", "nextjs",
  "vue", "angular", "svelte", "node.js", "nodejs", "express", "nestjs", "django",
  "flask", "fastapi", "spring", "spring boot", "rails", "laravel", "graphql",
  "rest", "grpc", "postgresql", "postgres", "mysql", "mongodb", "redis",
  "elasticsearch", "kafka", "rabbitmq", "docker", "kubernetes", "k8s", "terraform",
  "ansible", "aws", "azure", "gcp", "google cloud", "ci/cd", "jenkins",
  "github actions", "gitlab", "linux", "bash", "html", "css", "tailwind",
  "sass", "webpack", "vite", "jest", "cypress", "playwright", "selenium",
  "machine learning", "ml", "deep learning", "tensorflow", "pytorch", "nlp",
  "data analysis", "pandas", "numpy", "spark", "hadoop", "tableau", "power bi",
  "agile", "scrum", "jira", "git", "microservices", "serverless", "prisma",
  "sql", "nosql", "oauth", "jwt", "websocket", "figma", "ui/ux", "accessibility",
];

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Detect skills present in a block of free text using the skill bank. */
function detectSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = SKILL_BANK.filter((skill) => {
    const re = new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(skill)}([^a-z0-9+#.]|$)`, "i");
    return re.test(lower);
  });
  // Present them in a nicer cased form.
  return uniq(found.map(prettySkill));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function prettySkill(skill: string): string {
  const map: Record<string, string> = {
    javascript: "JavaScript", typescript: "TypeScript", "next.js": "Next.js",
    nextjs: "Next.js", "node.js": "Node.js", nodejs: "Node.js", aws: "AWS",
    gcp: "GCP", "ci/cd": "CI/CD", html: "HTML", css: "CSS", sql: "SQL",
    nosql: "NoSQL", "ui/ux": "UI/UX", k8s: "Kubernetes", ml: "Machine Learning",
    postgres: "PostgreSQL", postgresql: "PostgreSQL", graphql: "GraphQL",
    rest: "REST", jwt: "JWT", oauth: "OAuth",
  };
  if (map[skill]) return map[skill];
  return skill
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ");
}

// ─── Profile Extraction ───────────────────────────────────────────────────────

export function fallbackExtractProfile(rawText: string): ProfileData {
  const text = rawText || "";
  const ls = lines(text);

  const email = (text.match(EMAIL_RE) || [])[0];
  const phone = (text.match(PHONE_RE) || [])[0]?.trim();
  const linkedin = (text.match(LINKEDIN_RE) || [])[0];
  const github = (text.match(GITHUB_RE) || [])[0];

  // Name: first line that looks like a person's name (2-4 capitalized words).
  const name = ls.find((l) =>
    /^([A-Z][a-z'.-]+\s+){1,3}[A-Z][a-z'.-]+$/.test(l) && !EMAIL_RE.test(l)
  );

  // Location: a line that looks like "City, Country" or "City, ST".
  const location = ls.find((l) =>
    /^[A-Za-z .'-]+,\s*[A-Za-z .'-]{2,}$/.test(l) && l.length < 60 && l !== name
  );

  // Summary: text following a "Summary"/"Profile"/"About" heading.
  const summary = extractSection(text, ["summary", "profile", "about", "objective"]);

  // Skills: prefer an explicit skills section, else scan the whole document.
  const skillsSection = extractSection(text, ["skills", "technical skills", "technologies"]);
  const skills = detectSkills(skillsSection || text);

  const experience = extractExperience(text);
  const education = extractEducation(text);

  return {
    fullName: name,
    email,
    phone,
    location,
    linkedin,
    github,
    summary: summary?.slice(0, 600),
    skills,
    experience,
    education,
    certifications: [],
    languages: [],
    projects: [],
    awards: [],
    publications: [],
  };
}

/** Grab the paragraph(s) under one of the given headings. */
function extractSection(text: string, headings: string[]): string | undefined {
  const ls = text.split(/\r?\n/);
  const headingRe = new RegExp(`^\\s*(${headings.map(escapeRegExp).join("|")})\\s*:?\\s*$`, "i");
  const idx = ls.findIndex((l) => headingRe.test(l));
  if (idx === -1) {
    // Inline form: "Summary: ...".
    const inline = ls.find((l) =>
      new RegExp(`^\\s*(${headings.map(escapeRegExp).join("|")})\\s*:`, "i").test(l)
    );
    if (inline) return inline.split(/:(.+)/)[1]?.trim();
    return undefined;
  }
  const collected: string[] = [];
  for (let i = idx + 1; i < ls.length; i++) {
    const line = ls[i].trim();
    if (!line) {
      if (collected.length) break;
      continue;
    }
    // Stop at the next ALL-CAPS / Title heading.
    if (/^[A-Z][A-Za-z ]{2,30}:?$/.test(line) && line === line.toUpperCase()) break;
    collected.push(line);
    if (collected.join(" ").length > 600) break;
  }
  return collected.join(" ").trim() || undefined;
}

function extractExperience(text: string): WorkExperience[] {
  const section = sliceSection(text, ["experience", "work experience", "employment", "work history"]);
  if (!section) return [];
  const result: WorkExperience[] = [];
  // Match patterns like "Senior Engineer at Acme (Jan 2020 - Present)".
  const re = /^(.+?)\s+(?:at|@|[-–|·])\s+(.+?)(?:\s*[(,-]\s*(.+))?$/;
  for (const line of lines(section)) {
    const m = line.match(re);
    if (m && m[1] && m[2] && m[1].length < 80 && m[2].length < 80) {
      const dates = (m[3] || "").match(/([A-Za-z]{3,9}\.?\s*\d{4}|\d{4}|present|current)/gi) || [];
      result.push({
        title: m[1].trim(),
        company: m[2].trim().replace(/[()]/g, ""),
        startDate: dates[0] || "",
        endDate: dates[1] && !/present|current/i.test(dates[1]) ? dates[1] : undefined,
        current: /present|current/i.test(m[3] || ""),
        description: "",
      });
    }
    if (result.length >= 8) break;
  }
  return result;
}

function extractEducation(text: string): Education[] {
  const section = sliceSection(text, ["education", "academic background"]);
  if (!section) return [];
  const result: Education[] = [];
  const degreeRe = /(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|ph\.?d|bachelor|master|doctor|mba|diploma)/i;
  for (const line of lines(section)) {
    if (degreeRe.test(line)) {
      const parts = line.split(/[-–|·,]/).map((p) => p.trim()).filter(Boolean);
      result.push({
        degree: parts[0] || line,
        institution: parts[1] || "",
        field: parts[2],
        endDate: (line.match(/\d{4}/g) || []).pop(),
      });
    }
    if (result.length >= 6) break;
  }
  return result;
}

/** Return the text between a heading and the next heading. */
function sliceSection(text: string, headings: string[]): string | undefined {
  const ls = text.split(/\r?\n/);
  const headingRe = new RegExp(`^\\s*(${headings.map(escapeRegExp).join("|")})\\s*:?\\s*$`, "i");
  const start = ls.findIndex((l) => headingRe.test(l));
  if (start === -1) return undefined;
  const out: string[] = [];
  for (let i = start + 1; i < ls.length; i++) {
    const line = ls[i];
    if (/^[A-Z][A-Za-z ]{2,30}:?$/.test(line.trim()) && line.trim() === line.trim().toUpperCase()) break;
    out.push(line);
  }
  return out.join("\n").trim() || undefined;
}

// ─── Job Analysis ──────────────────────────────────────────────────────────────

export function fallbackAnalyzeJob(jobText: string): {
  title: string;
  company: string;
  location: string;
  jobType: string;
  salary: string;
  requirements: string[];
  keywords: string[];
  niceToHave: string[];
  culture: string[];
} {
  const text = jobText || "";
  const ls = lines(text);

  const title =
    matchInline(text, ["job title", "position", "role", "title"]) ||
    ls[0] ||
    "Position";

  const company =
    matchInline(text, ["company", "organization", "employer"]) ||
    (text.match(/\bat\s+([A-Z][A-Za-z0-9&.\- ]{2,40})/) || [])[1]?.trim() ||
    "";

  const location =
    matchInline(text, ["location", "based in"]) ||
    (/(remote|hybrid|on-?site)/i.exec(text)?.[1] ?? "") ||
    "";

  const jobType =
    (/(full[- ]?time|part[- ]?time|contract|freelance|internship)/i.exec(text)?.[1] ?? "Full-time");

  const salary =
    (/(\$|€|£)\s?\d[\d,.]*\s?(k|,\d{3})?(\s?-\s?(\$|€|£)?\s?\d[\d,.]*\s?(k|,\d{3})?)?/i.exec(text)?.[0] ?? "");

  // Requirements: bullet lines or lines mentioning experience/proficiency.
  const requirements = uniq(
    ls
      .filter((l) =>
        /^[-•*▪◦]/.test(l) ||
        /\b(\d+\+?\s*years?|experience|proficient|familiar|strong|knowledge of|degree)\b/i.test(l)
      )
      .map((l) => l.replace(/^[-•*▪◦]\s*/, "").trim())
      .filter((l) => l.length > 4 && l.length < 200)
  ).slice(0, 15);

  const keywords = detectSkills(text);

  const niceToHave = uniq(
    ls
      .filter((l) => /\b(nice to have|preferred|plus|bonus|a plus)\b/i.test(l))
      .map((l) => l.replace(/^[-•*▪◦]\s*/, "").trim())
  ).slice(0, 8);

  const culture = uniq(
    ls
      .filter((l) => /\b(culture|values|team|collaborat|mission|inclusive|diversity)\b/i.test(l))
      .map((l) => l.replace(/^[-•*▪◦]\s*/, "").trim())
  ).slice(0, 6);

  return { title: title.slice(0, 120), company: company.slice(0, 80), location, jobType, salary, requirements, keywords, niceToHave, culture };
}

function matchInline(text: string, labels: string[]): string | undefined {
  const re = new RegExp(`^\\s*(?:${labels.map(escapeRegExp).join("|")})\\s*:\\s*(.+)$`, "im");
  const m = text.match(re);
  return m?.[1]?.trim();
}

// ─── ATS Scoring ───────────────────────────────────────────────────────────────

export function fallbackATSScore(
  profile: ProfileData,
  job: JobDetails
): { score: number; matchedSkills: string[]; missingSkills: string[]; suggestions: string[] } {
  const profileTokens = uniq([
    ...(profile.skills || []),
    ...(profile.experience || []).flatMap((e) => [e.title, ...(e.technologies || [])]),
  ].map((s) => (s || "").toLowerCase()).filter(Boolean));

  const jobTerms = uniq([
    ...(job.keywords || []),
    ...(job.requirements || []),
  ].map((s) => (s || "").toLowerCase()).filter(Boolean));

  // For requirement phrases, also pull out known skills inside them.
  const jobSkillTerms = uniq([
    ...(job.keywords || []).map((k) => k.toLowerCase()),
    ...detectSkills(jobTerms.join("\n")).map((s) => s.toLowerCase()),
  ]);

  const compareTerms = jobSkillTerms.length ? jobSkillTerms : jobTerms;

  const matched: string[] = [];
  const missing: string[] = [];
  for (const term of compareTerms) {
    const hit = profileTokens.some((p) => p.includes(term) || term.includes(p));
    if (hit) matched.push(prettySkill(term));
    else missing.push(prettySkill(term));
  }

  const total = compareTerms.length || 1;
  const ratio = matched.length / total;
  // Scale into a realistic 40–98 band so empty profiles aren't a flat 0.
  const score = Math.max(0, Math.min(98, Math.round(40 + ratio * 58)));

  const suggestions: string[] = [];
  if (missing.length) {
    suggestions.push(`Add or emphasize these keywords if you have them: ${missing.slice(0, 6).join(", ")}.`);
  }
  if (!profile.summary) {
    suggestions.push("Add a targeted professional summary that mirrors the job title and top requirements.");
  }
  if ((profile.experience || []).length === 0) {
    suggestions.push("Add quantified work experience bullets aligned to the job's responsibilities.");
  }
  suggestions.push("Use exact keyword phrasing from the posting to maximize ATS keyword matching.");

  return { score, matchedSkills: uniq(matched), missingSkills: uniq(missing), suggestions: suggestions.slice(0, 5) };
}

// ─── Tailored CV (content reshaping only; HTML is rendered by the service) ──────

export function fallbackTailorProfile(profile: ProfileData, job: JobDetails): ProfileData {
  const jobSkills = uniq([
    ...(job.keywords || []),
    ...detectSkills([...(job.requirements || []), job.description || ""].join("\n")),
  ].map((s) => s.toLowerCase()));

  // Reorder skills: job-relevant first.
  const skills = profile.skills || [];
  const relevant = skills.filter((s) => jobSkills.some((j) => s.toLowerCase().includes(j) || j.includes(s.toLowerCase())));
  const rest = skills.filter((s) => !relevant.includes(s));

  const summary =
    profile.summary ||
    `${profile.fullName || "Candidate"} — ${job.title}. ` +
      `Results-driven professional aligned to ${job.company || "the role"} with strengths in ${relevant.slice(0, 5).join(", ") || (skills.slice(0, 5).join(", ") || "the required skill set")}.`;

  return {
    ...profile,
    summary,
    skills: uniq([...relevant, ...rest]),
  };
}

// ─── Cover Letter ──────────────────────────────────────────────────────────────

export function fallbackCoverLetter(
  profile: ProfileData,
  job: JobDetails,
  tone: string
): string {
  const name = profile.fullName || "Candidate";
  const recentRole = profile.experience?.[0];
  const topSkills = (profile.skills || []).slice(0, 6).join(", ");
  const topReqs = (job.requirements || []).slice(0, 3).join(", ");

  const openings: Record<string, string> = {
    professional: `I'm excited to apply for the ${job.title} role at ${job.company}.`,
    enthusiastic: `The ${job.title} opening at ${job.company} immediately caught my attention — it's exactly the kind of challenge I thrive on.`,
    formal: `I am writing to formally express my candidacy for the ${job.title} position at ${job.company}.`,
    creative: `When I read the ${job.title} posting at ${job.company}, I knew I had to reach out.`,
  };
  const opening = openings[tone] || openings.professional;

  return `<p>Dear ${job.company || "Hiring"} Team,</p>
<p>${opening} ${recentRole ? `As ${recentRole.title} at ${recentRole.company}, I` : "I"} have built directly relevant experience${topSkills ? ` across ${topSkills}` : ""}.</p>
<p>Your posting emphasizes ${topReqs || "the core requirements for this role"}, which closely matches my background. ${profile.summary ? profile.summary : `I focus on delivering measurable outcomes and collaborating across teams to ship high-quality work.`}</p>
<p>I would welcome the opportunity to discuss how my skills in ${topSkills || "this domain"} can contribute to ${job.company || "your team"}'s goals. Thank you for your consideration.</p>
<p>Sincerely,<br/>${name}</p>`;
}

// ─── Profile Merge ─────────────────────────────────────────────────────────────

export function fallbackMergeProfiles(sources: ProfileData[]): ProfileData {
  if (sources.length === 0) return {};
  const base: ProfileData = { ...sources[0] };

  const pick = (key: keyof ProfileData) =>
    sources.map((s) => s[key]).find((v) => v !== undefined && v !== null && v !== "");

  base.fullName = pick("fullName") as string | undefined;
  base.email = pick("email") as string | undefined;
  base.phone = pick("phone") as string | undefined;
  base.location = pick("location") as string | undefined;
  base.website = pick("website") as string | undefined;
  base.linkedin = pick("linkedin") as string | undefined;
  base.github = pick("github") as string | undefined;
  base.summary = sources.map((s) => s.summary).filter(Boolean).sort((a, b) => (b?.length || 0) - (a?.length || 0))[0];

  base.skills = uniq(sources.flatMap((s) => s.skills || []));

  base.experience = dedupeBy(
    sources.flatMap((s) => s.experience || []),
    (e) => `${(e.company || "").toLowerCase()}|${(e.title || "").toLowerCase()}`
  );
  base.education = dedupeBy(
    sources.flatMap((s) => s.education || []),
    (e) => `${(e.institution || "").toLowerCase()}|${(e.degree || "").toLowerCase()}`
  );
  base.certifications = dedupeBy(
    sources.flatMap((s) => s.certifications || []),
    (c) => `${(c.name || "").toLowerCase()}`
  );
  base.languages = dedupeBy(
    sources.flatMap((s) => s.languages || []),
    (l) => (l.name || "").toLowerCase()
  );
  base.projects = dedupeBy(
    sources.flatMap((s) => s.projects || []),
    (p) => (p.name || "").toLowerCase()
  );
  base.awards = dedupeBy(
    sources.flatMap((s) => s.awards || []),
    (a) => (a.title || "").toLowerCase()
  );
  base.publications = dedupeBy(
    sources.flatMap((s) => s.publications || []),
    (p) => (p.title || "").toLowerCase()
  );

  return base;
}

function dedupeBy<T>(arr: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (k && seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export { URL_RE };
