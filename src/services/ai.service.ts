/**
 * AI Service — Orchestrates Anthropic Claude and Google Gemini for CV
 * generation, job analysis, ATS scoring, and cover letter creation.
 *
 * Provider selection (per request):
 *   1. Claude   — used when ANTHROPIC_API_KEY is set (preferred for analysis)
 *   2. Gemini   — used when GEMINI_API_KEY is set
 *   3. Fallback — deterministic local generation when no key is configured
 * Override the preferred provider with AI_PROVIDER=claude|gemini.
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import {
  fallbackExtractProfile,
  fallbackAnalyzeJob,
  fallbackATSScore,
  fallbackTailorProfile,
  fallbackCoverLetter,
  fallbackMergeProfiles,
} from "./ai-fallback";
import {
  GERMAN_CV_TEMPLATES,
  buildAllTemplateStyles,
  DEFAULT_TEMPLATE_ID,
} from "@/lib/cv-templates";

// Types
export interface ProfileData {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  experience?: WorkExperience[];
  education?: Education[];
  skills?: string[];
  certifications?: Certification[];
  languages?: Language[];
  projects?: Project[];
  awards?: Award[];
  publications?: Publication[];
}

export interface WorkExperience {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description: string;
  achievements?: string[];
  technologies?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  description?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

export interface Language {
  name: string;
  proficiency: string;
}

export interface Project {
  name: string;
  description: string;
  url?: string;
  technologies?: string[];
  startDate?: string;
  endDate?: string;
}

export interface Award {
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface Publication {
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
  description?: string;
}

export interface JobDetails {
  title: string;
  company: string;
  location?: string;
  description: string;
  requirements?: string[];
  keywords?: string[];
}

export interface CVGenerationResult {
  content: ProfileData;
  htmlContent: string;
  atsScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
}

export interface CoverLetterResult {
  content: string;
  tone: string;
}

// ─── CV Template Styles ───────────────────────────────────────────────────────
// All templates share the same HTML markup/class names; only the CSS differs.
// Every theme uses standard fonts and selectable text so the result stays
// ATS-friendly when printed or exported.

export const CV_TEMPLATES = GERMAN_CV_TEMPLATES.map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
}));

const CV_TEMPLATE_STYLES: Record<string, string> = buildAllTemplateStyles();

// ─── AI Service Class ─────────────────────────────────────────────────────────

class AIService {
  private gemini: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private anthropic: Anthropic | null = null;

  private static readonly GEMINI_MODEL = "gemini-flash-latest";
  private get claudeModel(): string {
    return process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
  }

  /** True when a real Anthropic Claude key is configured. */
  private hasClaude(): boolean {
    const key = process.env.ANTHROPIC_API_KEY;
    return Boolean(key && key.length > 20 && !key.startsWith("your-"));
  }

  /** True when a real Gemini key is configured. */
  private hasGemini(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return Boolean(key && key.length > 20 && !key.startsWith("your-"));
  }

  /**
   * Returns true when a real, usable AI key is configured. Placeholder values
   * (the ones shipped in .env.example) are treated as "not live" so the app
   * transparently falls back to deterministic local generation.
   */
  isLive(): boolean {
    return this.hasClaude() || this.hasGemini();
  }

  /**
   * Which provider serves a request. Honors an explicit AI_PROVIDER override,
   * otherwise prefers Claude when available, then Gemini, then local fallback.
   */
  get engine(): "claude" | "gemini" | "fallback" {
    const override = (process.env.AI_PROVIDER || "").toLowerCase();
    if (override === "claude" && this.hasClaude()) return "claude";
    if (override === "gemini" && this.hasGemini()) return "gemini";
    if (this.hasClaude()) return "claude";
    if (this.hasGemini()) return "gemini";
    return "fallback";
  }

  /** Human/DB-friendly identifier of the model that served a request. */
  get modelName(): string {
    switch (this.engine) {
      case "claude":
        return this.claudeModel;
      case "gemini":
        return AIService.GEMINI_MODEL;
      default:
        return "local-fallback";
    }
  }

  private getGeminiModel(): GenerativeModel {
    if (!this.model) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
      this.gemini = new GoogleGenerativeAI(apiKey);
      this.model = this.gemini.getGenerativeModel({ model: AIService.GEMINI_MODEL });
    }
    return this.model;
  }

  private getAnthropic(): Anthropic {
    if (!this.anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
      this.anthropic = new Anthropic({ apiKey });
    }
    return this.anthropic;
  }

  /** Dispatches a prompt to the active provider and returns plain text. */
  private async generate(prompt: string): Promise<string> {
    if (this.engine === "claude") {
      try {
        return await this.generateWithClaude(prompt);
      } catch (e) {
        if (this.hasGemini()) {
          console.warn("Claude failed — retrying with Gemini:", e instanceof Error ? e.message : e);
          return this.generateWithGemini(prompt);
        }
        throw e;
      }
    }
    return this.generateWithGemini(prompt);
  }

  private async generateWithClaude(prompt: string): Promise<string> {
    const client = this.getAnthropic();
    const message = await client.messages.create({
      model: this.claudeModel,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    return message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
  }

  private async generateWithGemini(prompt: string): Promise<string> {
    const model = this.getGeminiModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  // ─── Profile Extraction ─────────────────────────────────────────────────

  /**
   * Extracts structured profile data from raw text (from PDF, LinkedIn, etc.)
   */
  async extractProfileFromText(rawText: string, sourceType: string): Promise<ProfileData> {
    if (!this.isLive()) return fallbackExtractProfile(rawText);

    const prompt = `You are an expert CV/resume parser. Extract structured information from the following ${sourceType} profile text.

Return a valid JSON object with this exact structure (use null for missing fields, empty arrays for missing lists):
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "website": "string",
  "linkedin": "string",
  "github": "string",
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "title": "string",
      "location": "string",
      "startDate": "string (e.g. Jan 2020)",
      "endDate": "string or null if current",
      "current": boolean,
      "description": "string",
      "achievements": ["string"],
      "technologies": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "startDate": "string",
      "endDate": "string",
      "grade": "string",
      "description": "string"
    }
  ],
  "skills": ["string"],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string",
      "credentialId": "string",
      "url": "string"
    }
  ],
  "languages": [
    { "name": "string", "proficiency": "Native|Fluent|Advanced|Intermediate|Basic" }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "url": "string",
      "technologies": ["string"],
      "startDate": "string",
      "endDate": "string"
    }
  ],
  "awards": [
    { "title": "string", "issuer": "string", "date": "string", "description": "string" }
  ]
}

Source text:
---
${rawText}
---

Return ONLY the JSON object, no markdown, no explanation.`;

    try {
      const response = await this.generate(prompt);
      const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned) as ProfileData;
    } catch (e) {
      console.warn("AI extractProfile failed — using local fallback:", e instanceof Error ? e.message : e);
      return fallbackExtractProfile(rawText);
    }
  }

  // ─── Job Analysis ────────────────────────────────────────────────────────

  /**
   * Analyzes a job description and extracts key requirements, keywords, and ATS terms
   */
  async analyzeJobDescription(jobText: string): Promise<{
    title: string;
    company: string;
    location: string;
    jobType: string;
    salary: string;
    requirements: string[];
    keywords: string[];
    niceToHave: string[];
    culture: string[];
  }> {
    if (!this.isLive()) return fallbackAnalyzeJob(jobText);

    const prompt = `You are an expert ATS (Applicant Tracking System) analyst and recruiter.
Analyze this job posting and extract structured information.

Return a valid JSON object:
{
  "title": "exact job title",
  "company": "company name",
  "location": "location (Remote/Hybrid/City, Country)",
  "jobType": "Full-time|Part-time|Contract|Freelance",
  "salary": "salary range if mentioned",
  "requirements": ["required skill/qualification"],
  "keywords": ["important ATS keyword"],
  "niceToHave": ["preferred but not required"],
  "culture": ["company culture points"]
}

Job posting:
---
${jobText}
---

Return ONLY valid JSON.`;

    try {
      const response = await this.generate(prompt);
      const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn("AI analyzeJob failed — using local fallback:", e instanceof Error ? e.message : e);
      return fallbackAnalyzeJob(jobText);
    }
  }

  // ─── ATS Scoring ─────────────────────────────────────────────────────────

  /**
   * Calculates an ATS compatibility score between profile and job
   */
  async calculateATSScore(
    profile: ProfileData,
    job: JobDetails
  ): Promise<{ score: number; matchedSkills: string[]; missingSkills: string[]; suggestions: string[] }> {
    if (!this.isLive()) return fallbackATSScore(profile, job);

    const prompt = `You are an ATS (Applicant Tracking System) expert. Score this candidate's profile against the job requirements.

PROFILE SKILLS: ${JSON.stringify(profile.skills || [])}
PROFILE EXPERIENCE: ${JSON.stringify((profile.experience || []).map(e => ({ title: e.title, company: e.company, description: e.description, technologies: e.technologies })))}

JOB TITLE: ${job.title} at ${job.company}
JOB REQUIREMENTS: ${JSON.stringify(job.requirements || [])}
JOB KEYWORDS: ${JSON.stringify(job.keywords || [])}

Return JSON:
{
  "score": number (0-100),
  "matchedSkills": ["skill that matched"],
  "missingSkills": ["skill the job needs but candidate lacks"],
  "suggestions": ["specific actionable suggestion to improve match"]
}

Return ONLY valid JSON.`;

    try {
      const response = await this.generate(prompt);
      const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn("AI ATS score failed — using local fallback:", e instanceof Error ? e.message : e);
      return fallbackATSScore(profile, job);
    }
  }

  // ─── CV Generation ───────────────────────────────────────────────────────

  /**
   * Generates a tailored CV optimized for a specific job
   */
  async generateTailoredCV(
    profile: ProfileData,
    job: JobDetails,
    atsAnalysis: { matchedSkills: string[]; missingSkills: string[]; keywords: string[] },
    template: string = DEFAULT_TEMPLATE_ID
  ): Promise<CVGenerationResult> {
    if (!this.isLive()) {
      const tailored = fallbackTailorProfile(profile, job);
      const htmlContent = this.generateCVHTML(tailored, job, template);
      const atsResult = await this.calculateATSScore(tailored, job);
      return {
        content: tailored,
        htmlContent,
        atsScore: atsResult.score,
        matchedSkills: atsResult.matchedSkills,
        missingSkills: atsResult.missingSkills,
        suggestions: atsResult.suggestions,
      };
    }

    const prompt = `You are an expert CV writer and ATS optimization specialist.
Create a highly tailored, ATS-optimized CV for this candidate applying for the specified role.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

TARGET JOB:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || "Not specified"}
- Description: ${job.description}
- Key Requirements: ${JSON.stringify(job.requirements)}
- Important Keywords: ${JSON.stringify(job.keywords)}

ATS ANALYSIS:
- Matched Skills: ${JSON.stringify(atsAnalysis.matchedSkills)}
- Missing Skills (highlight if candidate has them): ${JSON.stringify(atsAnalysis.missingSkills)}

INSTRUCTIONS:
1. Rewrite the professional summary to directly target this role
2. Reorder and emphasize experience most relevant to this job
3. Naturally incorporate job keywords throughout
4. Quantify achievements where possible
5. Tailor bullet points to match job requirements
6. Keep it honest — only use information from the profile
7. Use strong action verbs

Return a JSON object with the SAME structure as the input profile but with tailored content:
{
  "fullName": "...",
  "email": "...",
  "phone": "...",
  "location": "...",
  "website": "...",
  "linkedin": "...",
  "github": "...",
  "summary": "tailored professional summary (3-4 sentences, keyword-rich)",
  "experience": [...tailored experience array, reordered by relevance...],
  "education": [...],
  "skills": [...reordered with most relevant first...],
  "certifications": [...],
  "languages": [...],
  "projects": [...most relevant projects highlighted...]
}

Return ONLY valid JSON.`;

    let parsedContent: ProfileData = fallbackTailorProfile(profile, job);

    try {
      const tailoredContent = await this.generate(prompt);
      const cleaned = tailoredContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsedContent = JSON.parse(cleaned);
    } catch (e) {
      console.warn("AI CV generation failed — using local fallback:", e instanceof Error ? e.message : e);
    }

    const htmlContent = this.generateCVHTML(parsedContent, job, template);
    const atsResult = await this.calculateATSScore(parsedContent, job);

    return {
      content: parsedContent,
      htmlContent,
      atsScore: atsResult.score,
      matchedSkills: atsResult.matchedSkills,
      missingSkills: atsResult.missingSkills,
      suggestions: atsResult.suggestions,
    };
  }

  // ─── Cover Letter Generation ──────────────────────────────────────────────

  /**
   * Generates a tailored, compelling cover letter
   */
  async generateCoverLetter(
    profile: ProfileData,
    job: JobDetails,
    tone: "professional" | "enthusiastic" | "formal" | "creative" = "professional"
  ): Promise<CoverLetterResult> {
    if (!this.isLive()) return { content: fallbackCoverLetter(profile, job, tone), tone };

    const toneGuide = {
      professional: "professional, confident, and direct",
      enthusiastic: "enthusiastic, energetic, and passionate about the role",
      formal: "formal, structured, and traditional",
      creative: "creative, unique, and memorable while remaining appropriate",
    };

    const prompt = `You are an expert cover letter writer. Write a compelling, highly personalized cover letter.

CANDIDATE:
- Name: ${profile.fullName}
- Current/Recent Title: ${profile.experience?.[0]?.title || "Professional"} at ${profile.experience?.[0]?.company || ""}
- Key Skills: ${(profile.skills || []).slice(0, 10).join(", ")}
- Summary: ${profile.summary || ""}

TARGET ROLE:
- Job Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || ""}
- Key Requirements: ${(job.requirements || []).slice(0, 8).join(", ")}

TONE: Write in a ${toneGuide[tone]} tone.

STRUCTURE:
1. Opening paragraph: Hook + specific role + why this company
2. Body paragraph 1: Most relevant experience/achievement aligned to top requirement
3. Body paragraph 2: Key skills/value proposition + specific example
4. Closing paragraph: Call to action + enthusiasm

RULES:
- Maximum 400 words
- Use specific details from the profile and job
- Do NOT use generic phrases like "I am writing to express my interest"
- Reference specific requirements from the job
- Show you've researched the company
- Natural, human writing — not robotic

Return the cover letter as clean HTML with <p> tags. No markdown.`;

    try {
      const content = await this.generate(prompt);
      return { content, tone };
    } catch (e) {
      console.warn("AI cover letter failed — using local fallback:", e instanceof Error ? e.message : e);
      return { content: fallbackCoverLetter(profile, job, tone), tone };
    }
  }

  // ─── Profile Merging ─────────────────────────────────────────────────────

  /**
   * Intelligently merges multiple profile sources into a single master profile
   */
  async mergeProfileSources(sources: ProfileData[]): Promise<ProfileData> {
    if (sources.length === 0) return {};
    if (sources.length === 1) return sources[0];
    if (!this.isLive()) return fallbackMergeProfiles(sources);

    const prompt = `You are an expert at merging professional profiles from multiple sources.
Merge these ${sources.length} profile sources into ONE comprehensive, deduplicated master profile.

Rules:
- Keep the most complete/recent information
- Deduplicate experiences and education (same role at same company = one entry)
- Combine skills from all sources (remove duplicates)
- Use the most detailed description for each entry
- Merge all certifications, projects, awards
- Use the most complete personal info

Sources:
${sources.map((s, i) => `SOURCE ${i + 1}:\n${JSON.stringify(s, null, 2)}`).join("\n\n---\n\n")}

Return a single merged profile as valid JSON with the same structure as the input sources.
Return ONLY valid JSON.`;

    try {
      const response = await this.generate(prompt);
      const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn("AI merge failed — using local fallback:", e instanceof Error ? e.message : e);
      return fallbackMergeProfiles(sources);
    }
  }

  // ─── HTML CV Template ─────────────────────────────────────────────────────

  /** Public helper to render a profile into themed CV HTML (used for previews). */
  renderCVHTML(profile: ProfileData, template: string = DEFAULT_TEMPLATE_ID, job?: JobDetails): string {
    return this.generateCVHTML(profile, job, template);
  }

  private generateCVHTML(profile: ProfileData, job?: JobDetails, template: string = DEFAULT_TEMPLATE_ID): string {
    const skills = (profile.skills || []).slice(0, 20);
    const experience = profile.experience || [];
    const education = profile.education || [];
    const certifications = profile.certifications || [];
    const projects = profile.projects || [];

    const styles = CV_TEMPLATE_STYLES[template] ?? CV_TEMPLATE_STYLES[DEFAULT_TEMPLATE_ID];

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${profile.fullName || "CV"} - ${job?.title || "Resume"}</title>
  <style>${styles}</style>
</head>
<body>
<div class="cv-container">
  <div class="header">
    <div class="name">${profile.fullName || ""}</div>
    ${job?.title ? `<div class="title">${job.title}</div>` : ""}
    <div class="contact">
      ${profile.email ? `<span>✉ ${profile.email}</span>` : ""}
      ${profile.phone ? `<span>📱 ${profile.phone}</span>` : ""}
      ${profile.location ? `<span>📍 ${profile.location}</span>` : ""}
      ${profile.linkedin ? `<span>🔗 ${profile.linkedin}</span>` : ""}
      ${profile.github ? `<span>💻 ${profile.github}</span>` : ""}
      ${profile.website ? `<span>🌐 ${profile.website}</span>` : ""}
    </div>
  </div>

  ${profile.summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary">${profile.summary}</p>
  </div>` : ""}

  ${experience.length > 0 ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${experience.map((exp) => `
    <div class="experience-item">
      <div class="exp-header">
        <div>
          <span class="exp-title">${exp.title}</span> · <span class="exp-company">${exp.company}</span>
          ${exp.location ? `<div class="exp-location">📍 ${exp.location}</div>` : ""}
        </div>
        <div class="exp-date">${exp.startDate} — ${exp.current ? "Present" : (exp.endDate || "")}</div>
      </div>
      ${exp.description ? `<p class="exp-description">${exp.description}</p>` : ""}
      ${(exp.achievements || []).length > 0 ? `
      <ul class="achievements">
        ${exp.achievements!.map((a) => `<li>${a}</li>`).join("")}
      </ul>` : ""}
      ${(exp.technologies || []).length > 0 ? `
      <div class="tech-tags">
        ${exp.technologies!.map((t) => `<span class="tech-tag">${t}</span>`).join("")}
      </div>` : ""}
    </div>`).join("")}
  </div>` : ""}

  ${education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${education.map((edu) => `
    <div class="edu-item">
      <div class="exp-header">
        <div>
          <span class="edu-degree">${edu.degree}${edu.field ? ` in ${edu.field}` : ""}</span>
          <div class="edu-institution">${edu.institution}</div>
        </div>
        <div class="exp-date">${edu.startDate || ""} ${edu.endDate ? "— " + edu.endDate : ""}</div>
      </div>
      ${edu.grade ? `<div class="exp-location">Grade: ${edu.grade}</div>` : ""}
    </div>`).join("")}
  </div>` : ""}

  ${skills.length > 0 ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-grid">
      ${skills.map((s) => `<span class="skill-badge">${s}</span>`).join("")}
    </div>
  </div>` : ""}

  ${certifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    ${certifications.map((c) => `
    <div class="cert-item">
      <strong>${c.name}</strong> · ${c.issuer}${c.date ? ` · ${c.date}` : ""}
    </div>`).join("")}
  </div>` : ""}

  ${projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${projects.map((p) => `
    <div class="experience-item">
      <div class="exp-title">${p.name}</div>
      <p class="exp-description">${p.description}</p>
      ${(p.technologies || []).length > 0 ? `
      <div class="tech-tags">
        ${p.technologies!.map((t) => `<span class="tech-tag">${t}</span>`).join("")}
      </div>` : ""}
    </div>`).join("")}
  </div>` : ""}
</div>
</body>
</html>`;
  }
}

export const aiService = new AIService();
