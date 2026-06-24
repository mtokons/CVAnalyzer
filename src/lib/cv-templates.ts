/**
 * German job-market CV (Lebenslauf) templates.
 *
 * 20 professional, DIN-5008-friendly styles that are popular and recommended
 * for the German market. Each template is a parameterized theme that renders
 * against the shared CV markup produced in ai.service.ts (`generateCVHTML`),
 * so they all stay ATS-safe (single column, selectable text) while looking
 * visually distinct.
 *
 * The same markup is reused by the PDF exporter, so changing a theme here
 * only affects the on-screen / HTML rendering, never the data.
 */

export type HeaderStyle = "left" | "centered" | "banner" | "boxed" | "accentbar";
export type SectionStyle = "underline" | "bar" | "filled" | "caps";
export type BadgeStyle = "pill-filled" | "pill-outline" | "tag" | "text";
export type NameCase = "none" | "upper";

export interface TemplateTheme {
  font: string;
  baseSize: string; // e.g. "10pt"
  accent: string; // primary accent (links, companies, bars)
  accentDark: string; // name + strong headings
  light: string; // badge / fill background
  border: string; // subtle borders
  text: string; // body text
  muted: string; // secondary text
  header: HeaderStyle;
  section: SectionStyle;
  badge: BadgeStyle;
  nameCase: NameCase;
  serif?: boolean;
}

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  /** Roles this template is especially recommended for. */
  recommendedFor: string[];
  theme: TemplateTheme;
}

const ARCH = "solution-architect";
const ENG = "software-engineer";

export const GERMAN_CV_TEMPLATES: CVTemplate[] = [
  {
    id: "berlin-modern",
    name: "Berlin Modern",
    description: "Clean sans-serif with a confident blue accent — a safe all-rounder.",
    recommendedFor: [ENG, ARCH],
    theme: {
      font: "'Calibri', 'Segoe UI', Arial, sans-serif",
      baseSize: "10pt",
      accent: "#2563eb",
      accentDark: "#1e293b",
      light: "#eff4ff",
      border: "#dbe4ff",
      text: "#1f2937",
      muted: "#6b7280",
      header: "left",
      section: "underline",
      badge: "pill-filled",
      nameCase: "none",
    },
  },
  {
    id: "munich-executive",
    name: "München Executive",
    description: "Navy serif headings in a boxed header — senior and authoritative.",
    recommendedFor: [ARCH],
    theme: {
      font: "'Georgia', 'Times New Roman', serif",
      baseSize: "10.5pt",
      accent: "#1e3a8a",
      accentDark: "#0f172a",
      light: "#eef2fb",
      border: "#c7d2e8",
      text: "#1f2937",
      muted: "#64748b",
      header: "boxed",
      section: "bar",
      badge: "pill-outline",
      nameCase: "none",
      serif: true,
    },
  },
  {
    id: "hamburg-clean",
    name: "Hamburg Clean",
    description: "Airy minimal layout with a teal accent — modern and uncluttered.",
    recommendedFor: [ENG],
    theme: {
      font: "'Helvetica Neue', Arial, sans-serif",
      baseSize: "10pt",
      accent: "#0d9488",
      accentDark: "#134e4a",
      light: "#e6f5f3",
      border: "#cfe9e5",
      text: "#27343f",
      muted: "#7b8a99",
      header: "left",
      section: "caps",
      badge: "text",
      nameCase: "none",
    },
  },
  {
    id: "frankfurt-corporate",
    name: "Frankfurt Corporate",
    description: "Full-width banner header in corporate blue — formal and structured.",
    recommendedFor: [ARCH, ENG],
    theme: {
      font: "'Arial', 'Helvetica', sans-serif",
      baseSize: "10pt",
      accent: "#1d4ed8",
      accentDark: "#1e293b",
      light: "#eaf0ff",
      border: "#d4ddf5",
      text: "#22303c",
      muted: "#667085",
      header: "banner",
      section: "underline",
      badge: "pill-filled",
      nameCase: "none",
    },
  },
  {
    id: "cologne-creative",
    name: "Köln Creative",
    description: "Purple accent with a left accent bar — distinctive yet professional.",
    recommendedFor: [ENG],
    theme: {
      font: "'Segoe UI', 'Calibri', sans-serif",
      baseSize: "10pt",
      accent: "#7c3aed",
      accentDark: "#3b0764",
      light: "#f3ecff",
      border: "#e2d4ff",
      text: "#2a2240",
      muted: "#6f6790",
      header: "accentbar",
      section: "bar",
      badge: "pill-filled",
      nameCase: "none",
    },
  },
  {
    id: "stuttgart-engineer",
    name: "Stuttgart Engineer",
    description: "Graphite + green, technical feel with tag-style skills.",
    recommendedFor: [ENG],
    theme: {
      font: "'Roboto', 'Segoe UI', Arial, sans-serif",
      baseSize: "10pt",
      accent: "#15803d",
      accentDark: "#1f2937",
      light: "#e8f6ec",
      border: "#cfe9d6",
      text: "#263238",
      muted: "#6b7780",
      header: "left",
      section: "bar",
      badge: "tag",
      nameCase: "none",
    },
  },
  {
    id: "dusseldorf-elegant",
    name: "Düsseldorf Elegant",
    description: "Burgundy serif, refined and classic for senior profiles.",
    recommendedFor: [ARCH],
    theme: {
      font: "'Georgia', 'Cambria', serif",
      baseSize: "10.5pt",
      accent: "#9d174d",
      accentDark: "#4c0519",
      light: "#fbeaf1",
      border: "#eccdd9",
      text: "#2b2228",
      muted: "#7a6a72",
      header: "centered",
      section: "underline",
      badge: "text",
      nameCase: "none",
      serif: true,
    },
  },
  {
    id: "dresden-classic",
    name: "Dresden Classic",
    description: "Timeless centered serif in black — the traditional Lebenslauf.",
    recommendedFor: [ARCH, ENG],
    theme: {
      font: "'Times New Roman', 'Georgia', serif",
      baseSize: "10.5pt",
      accent: "#111111",
      accentDark: "#000000",
      light: "#f0f0f0",
      border: "#bbbbbb",
      text: "#1a1a1a",
      muted: "#555555",
      header: "centered",
      section: "underline",
      badge: "text",
      nameCase: "none",
      serif: true,
    },
  },
  {
    id: "leipzig-fresh",
    name: "Leipzig Fresh",
    description: "Bright cyan accent, friendly and contemporary.",
    recommendedFor: [ENG],
    theme: {
      font: "'Segoe UI', 'Calibri', sans-serif",
      baseSize: "10pt",
      accent: "#0891b2",
      accentDark: "#164e63",
      light: "#e3f6fb",
      border: "#c6e9f2",
      text: "#21323a",
      muted: "#6a8290",
      header: "left",
      section: "filled",
      badge: "pill-filled",
      nameCase: "none",
    },
  },
  {
    id: "nuremberg-bold",
    name: "Nürnberg Bold",
    description: "Strong orange accent with bold headings — stands out confidently.",
    recommendedFor: [ENG],
    theme: {
      font: "'Arial', 'Helvetica', sans-serif",
      baseSize: "10pt",
      accent: "#ea580c",
      accentDark: "#7c2d12",
      light: "#fdeee4",
      border: "#f6d3bd",
      text: "#2a2320",
      muted: "#82756c",
      header: "accentbar",
      section: "filled",
      badge: "pill-filled",
      nameCase: "upper",
    },
  },
  {
    id: "hannover-professional",
    name: "Hannover Professional",
    description: "Slate tones with underlined sections — balanced and corporate.",
    recommendedFor: [ARCH, ENG],
    theme: {
      font: "'Calibri', 'Segoe UI', sans-serif",
      baseSize: "10pt",
      accent: "#475569",
      accentDark: "#1e293b",
      light: "#eef1f5",
      border: "#d3dae3",
      text: "#27313c",
      muted: "#6b7785",
      header: "left",
      section: "underline",
      badge: "pill-outline",
      nameCase: "none",
    },
  },
  {
    id: "bremen-minimal",
    name: "Bremen Minimal",
    description: "Monochrome, generous whitespace — quiet and elegant.",
    recommendedFor: [ENG, ARCH],
    theme: {
      font: "'Helvetica Neue', Arial, sans-serif",
      baseSize: "10pt",
      accent: "#111827",
      accentDark: "#000000",
      light: "#f3f4f6",
      border: "#e5e7eb",
      text: "#374151",
      muted: "#9ca3af",
      header: "left",
      section: "caps",
      badge: "text",
      nameCase: "upper",
    },
  },
  {
    id: "dortmund-tech",
    name: "Dortmund Tech",
    description: "Dark slate with monospace headings — built for developers.",
    recommendedFor: [ENG],
    theme: {
      font: "'Segoe UI', Arial, sans-serif",
      baseSize: "10pt",
      accent: "#0f766e",
      accentDark: "#0b1220",
      light: "#e7f3f1",
      border: "#cbe4df",
      text: "#1f2933",
      muted: "#6b7785",
      header: "boxed",
      section: "bar",
      badge: "tag",
      nameCase: "none",
    },
  },
  {
    id: "essen-formal",
    name: "Essen Formal",
    description: "Deep navy, formal and conservative — ideal for enterprises.",
    recommendedFor: [ARCH],
    theme: {
      font: "'Georgia', 'Times New Roman', serif",
      baseSize: "10.5pt",
      accent: "#1e3a5f",
      accentDark: "#0c1b2a",
      light: "#eaf0f6",
      border: "#c9d6e3",
      text: "#22303c",
      muted: "#64748b",
      header: "banner",
      section: "underline",
      badge: "pill-outline",
      nameCase: "none",
      serif: true,
    },
  },
  {
    id: "bonn-academic",
    name: "Bonn Academic",
    description: "Scholarly serif with centered header — great for research roles.",
    recommendedFor: [ARCH, ENG],
    theme: {
      font: "'Cambria', 'Georgia', serif",
      baseSize: "10.5pt",
      accent: "#3f3f46",
      accentDark: "#18181b",
      light: "#f1f1f2",
      border: "#d4d4d8",
      text: "#27272a",
      muted: "#71717a",
      header: "centered",
      section: "bar",
      badge: "text",
      nameCase: "none",
      serif: true,
    },
  },
  {
    id: "mannheim-sleek",
    name: "Mannheim Sleek",
    description: "Indigo accent, sleek modern lines and pill skills.",
    recommendedFor: [ENG, ARCH],
    theme: {
      font: "'Segoe UI', 'Calibri', sans-serif",
      baseSize: "10pt",
      accent: "#4f46e5",
      accentDark: "#1e1b4b",
      light: "#ecebfe",
      border: "#d6d3fb",
      text: "#26243a",
      muted: "#6d6a86",
      header: "accentbar",
      section: "underline",
      badge: "pill-filled",
      nameCase: "none",
    },
  },
  {
    id: "karlsruhe-architect",
    name: "Karlsruhe Architect",
    description: "Steel-blue, highly structured — tuned for solution architects.",
    recommendedFor: [ARCH],
    theme: {
      font: "'Calibri', 'Segoe UI', sans-serif",
      baseSize: "10pt",
      accent: "#0e7490",
      accentDark: "#0f2c3a",
      light: "#e6f3f7",
      border: "#c5e2eb",
      text: "#22323a",
      muted: "#5f7681",
      header: "boxed",
      section: "filled",
      badge: "pill-outline",
      nameCase: "none",
    },
  },
  {
    id: "wiesbaden-refined",
    name: "Wiesbaden Refined",
    description: "Charcoal with a gold accent — understated premium feel.",
    recommendedFor: [ARCH],
    theme: {
      font: "'Georgia', 'Cambria', serif",
      baseSize: "10.5pt",
      accent: "#b45309",
      accentDark: "#292524",
      light: "#f7efe2",
      border: "#e6d6bd",
      text: "#2b2620",
      muted: "#857b6c",
      header: "centered",
      section: "bar",
      badge: "text",
      nameCase: "none",
      serif: true,
    },
  },
  {
    id: "augsburg-simple",
    name: "Augsburg Simple",
    description: "Neutral grey, no-nonsense and easy to scan.",
    recommendedFor: [ENG, ARCH],
    theme: {
      font: "'Arial', 'Helvetica', sans-serif",
      baseSize: "10pt",
      accent: "#52525b",
      accentDark: "#27272a",
      light: "#f4f4f5",
      border: "#e4e4e7",
      text: "#3f3f46",
      muted: "#a1a1aa",
      header: "left",
      section: "underline",
      badge: "pill-outline",
      nameCase: "none",
    },
  },
  {
    id: "freiburg-eco",
    name: "Freiburg Eco",
    description: "Forest-green accent, calm and approachable.",
    recommendedFor: [ENG],
    theme: {
      font: "'Segoe UI', 'Calibri', sans-serif",
      baseSize: "10pt",
      accent: "#166534",
      accentDark: "#14311f",
      light: "#e8f3ea",
      border: "#cce4d2",
      text: "#22322a",
      muted: "#6a7e70",
      header: "left",
      section: "bar",
      badge: "pill-filled",
      nameCase: "none",
    },
  },
];

/** Lightweight metadata list for UI (no CSS). */
export const TEMPLATE_LIST = GERMAN_CV_TEMPLATES.map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  recommendedFor: t.recommendedFor,
  accent: t.theme.accent,
  accentDark: t.theme.accentDark,
  font: t.theme.font,
  serif: Boolean(t.theme.serif),
  header: t.theme.header,
}));

export const DEFAULT_TEMPLATE_ID = "berlin-modern";

/** Returns template ids recommended for a given role keyword. */
export function recommendTemplatesForRole(role?: string): string[] {
  const r = (role || "").toLowerCase();
  let key: string | null = null;
  if (/architect/.test(r)) key = ARCH;
  else if (/engineer|developer|software|programmer/.test(r)) key = ENG;
  if (!key) return [DEFAULT_TEMPLATE_ID];
  return GERMAN_CV_TEMPLATES.filter((t) => t.recommendedFor.includes(key!)).map((t) => t.id);
}

function headerCSS(t: TemplateTheme): string {
  switch (t.header) {
    case "centered":
      return `
    .header { text-align: center; border-bottom: 2px solid ${t.accentDark}; padding-bottom: 14px; margin-bottom: 20px; }
    .contact { justify-content: center; }`;
    case "banner":
      return `
    .header { background: ${t.accent}; color: #fff; padding: 22px 24px; margin: -32px -32px 22px; border-radius: 0 0 6px 6px; }
    .header .name { color: #fff; }
    .header .title { color: rgba(255,255,255,0.9); }
    .header .contact { color: rgba(255,255,255,0.92); }`;
    case "boxed":
      return `
    .header { border: 2px solid ${t.accentDark}; padding: 16px 18px; margin-bottom: 22px; border-radius: 6px; }`;
    case "accentbar":
      return `
    .header { border-left: 5px solid ${t.accent}; padding: 4px 0 14px 16px; margin-bottom: 20px; border-bottom: 1px solid ${t.border}; }`;
    case "left":
    default:
      return `
    .header { border-bottom: 3px solid ${t.accent}; padding-bottom: 16px; margin-bottom: 20px; }`;
  }
}

function sectionCSS(t: TemplateTheme): string {
  switch (t.section) {
    case "bar":
      return `
    .section-title { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${t.accentDark}; border-left: 4px solid ${t.accent}; padding: 2px 0 2px 10px; margin-bottom: 10px; }`;
    case "filled":
      return `
    .section-title { font-size: 10.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${t.accentDark}; background: ${t.light}; padding: 5px 10px; border-radius: 4px; margin-bottom: 10px; }`;
    case "caps":
      return `
    .section-title { font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: ${t.muted}; margin-bottom: 10px; }`;
    case "underline":
    default:
      return `
    .section-title { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${t.accent}; border-bottom: 1px solid ${t.border}; padding-bottom: 4px; margin-bottom: 10px; }`;
  }
}

function badgeCSS(t: TemplateTheme): string {
  switch (t.badge) {
    case "pill-outline":
      return `
    .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-badge { color: ${t.accentDark}; padding: 3px 11px; border-radius: 16px; font-size: 9pt; border: 1px solid ${t.accent}; }
    .tech-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .tech-tag { color: ${t.accent}; padding: 2px 8px; border-radius: 12px; font-size: 8.5pt; border: 1px solid ${t.border}; }`;
    case "tag":
      return `
    .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-badge { background: ${t.light}; color: ${t.accentDark}; padding: 3px 10px; border-radius: 3px; font-size: 9pt; border-left: 3px solid ${t.accent}; }
    .tech-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .tech-tag { background: ${t.light}; color: ${t.accent}; padding: 2px 7px; border-radius: 3px; font-size: 8.5pt; }`;
    case "text":
      return `
    .skills-grid { font-size: 10pt; line-height: 1.7; color: ${t.text}; }
    .skill-badge:not(:last-child)::after { content: ' \\2022 '; color: ${t.muted}; }
    .tech-tags { margin-top: 6px; font-size: 9pt; color: ${t.muted}; }
    .tech-tag:not(:last-child)::after { content: ' \\00b7 '; }`;
    case "pill-filled":
    default:
      return `
    .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-badge { background: ${t.light}; color: ${t.accentDark}; padding: 4px 12px; border-radius: 16px; font-size: 9pt; border: 1px solid ${t.border}; }
    .tech-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .tech-tag { background: ${t.light}; color: ${t.accent}; padding: 2px 8px; border-radius: 12px; font-size: 8.5pt; }`;
  }
}

/** Builds the full CSS string for a template theme against the shared markup. */
export function buildTemplateCSS(theme: TemplateTheme): string {
  const t = theme;
  const nameTransform = t.nameCase === "upper" ? "text-transform: uppercase; letter-spacing: 1.5px;" : "";
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${t.font}; font-size: ${t.baseSize}; color: ${t.text}; background: white; }
    .cv-container { max-width: 800px; margin: 0 auto; padding: 32px; }
    .name { font-size: 25pt; font-weight: 700; color: ${t.accentDark}; ${nameTransform} }
    .title { font-size: 12pt; color: ${t.accent}; font-weight: 600; margin-top: 4px; ${t.serif ? "font-style: italic;" : ""} }
    .contact { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; font-size: 9pt; color: ${t.muted}; }
    .contact span { display: flex; align-items: center; gap: 4px; }
    ${headerCSS(t)}
    .section { margin-bottom: 18px; }
    ${sectionCSS(t)}
    .summary { font-size: ${t.baseSize}; line-height: 1.6; color: ${t.text}; ${t.serif ? "text-align: justify;" : ""} }
    .experience-item { margin-bottom: 12px; }
    .exp-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .exp-title { font-weight: 700; font-size: 10.5pt; color: ${t.accentDark}; }
    .exp-company { color: ${t.accent}; font-weight: 600; ${t.serif ? "font-style: italic;" : ""} }
    .exp-date { font-size: 9pt; color: ${t.muted}; white-space: nowrap; }
    .exp-location { font-size: 9pt; color: ${t.muted}; }
    .exp-description { font-size: 9.5pt; line-height: 1.5; margin-top: 5px; color: ${t.text}; }
    .achievements { margin-top: 5px; padding-left: 16px; }
    .achievements li { font-size: 9.5pt; line-height: 1.5; margin-bottom: 2px; color: ${t.text}; }
    ${badgeCSS(t)}
    .edu-item { margin-bottom: 10px; }
    .edu-degree { font-weight: 700; color: ${t.accentDark}; }
    .edu-institution { color: ${t.accent}; ${t.serif ? "font-style: italic;" : ""} }
    .cert-item { margin-bottom: 6px; font-size: 9.5pt; color: ${t.text}; }
    @media print {
      body { font-size: 9.5pt; }
      .cv-container { padding: 20px; max-width: 100%; }
      ${t.header === "banner" ? ".header { margin: -20px -20px 18px; }" : ""}
    }
  `;
}

/** Map of templateId -> CSS, including legacy ids (modern/classic/minimal aliases). */
export function buildAllTemplateStyles(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const tpl of GERMAN_CV_TEMPLATES) {
    map[tpl.id] = buildTemplateCSS(tpl.theme);
  }
  // Legacy aliases so existing saved CVs keep rendering.
  map.modern = map["berlin-modern"];
  map.classic = map["dresden-classic"];
  map.minimal = map["bremen-minimal"];
  return map;
}
