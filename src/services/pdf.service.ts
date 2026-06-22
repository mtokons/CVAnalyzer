import PDFDocument from "pdfkit";
import type { ProfileData, WorkExperience, Education } from "./ai.service";

const PAGE_MARGIN = 50;
const ACCENT = "#1e293b";
const MUTED = "#475569";
const RULE = "#cbd5e1";

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function sectionHeader(doc: PDFKit.PDFDocument, label: string) {
  doc.moveDown(0.6);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(ACCENT)
    .text(label.toUpperCase(), { characterSpacing: 1 });
  const y = doc.y + 2;
  doc
    .moveTo(PAGE_MARGIN, y)
    .lineTo(doc.page.width - PAGE_MARGIN, y)
    .lineWidth(0.75)
    .strokeColor(RULE)
    .stroke();
  doc.moveDown(0.5);
}

function dateRange(start?: string, end?: string, current?: boolean): string {
  const e = current ? "Present" : end || "";
  if (start && e) return `${start} – ${e}`;
  return start || e || "";
}

/**
 * Generates an ATS-friendly, text-based PDF from a structured CV profile.
 * Text remains selectable so applicant tracking systems can parse it.
 */
export async function generateCVPDF(profile: ProfileData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
  const bufferPromise = streamToBuffer(doc);

  // ── Header ────────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(24).fillColor(ACCENT);
  doc.text(profile.fullName || "Your Name");

  const contactParts = [
    profile.email,
    profile.phone,
    profile.location,
    profile.website,
    profile.linkedin,
    profile.github,
  ].filter(Boolean);
  if (contactParts.length) {
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(contactParts.join("  •  "));
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  if (profile.summary) {
    sectionHeader(doc, "Summary");
    doc.font("Helvetica").fontSize(10).fillColor("#111827").text(profile.summary, {
      align: "left",
      lineGap: 2,
    });
  }

  // ── Experience ────────────────────────────────────────────────────────────
  const experience = (profile.experience || []) as WorkExperience[];
  if (experience.length) {
    sectionHeader(doc, "Experience");
    experience.forEach((exp, i) => {
      if (i > 0) doc.moveDown(0.5);
      const range = dateRange(exp.startDate, exp.endDate, exp.current);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(ACCENT);
      doc.text(exp.title || "", { continued: !!range });
      if (range) {
        doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(`   ${range}`, { align: "right" });
      }
      const sub = [exp.company, exp.location].filter(Boolean).join(" — ");
      if (sub) doc.font("Helvetica-Oblique").fontSize(10).fillColor(MUTED).text(sub);
      if (exp.description) {
        doc.font("Helvetica").fontSize(10).fillColor("#111827").text(exp.description, { lineGap: 1.5 });
      }
      (exp.achievements || []).forEach((a) => {
        doc.font("Helvetica").fontSize(10).fillColor("#111827").text(`•  ${a}`, {
          indent: 10,
          lineGap: 1.5,
        });
      });
      if (exp.technologies?.length) {
        doc
          .font("Helvetica-Oblique")
          .fontSize(9)
          .fillColor(MUTED)
          .text(`Technologies: ${exp.technologies.join(", ")}`);
      }
    });
  }

  // ── Education ──────────────────────────────────────────────────────────────
  const education = (profile.education || []) as Education[];
  if (education.length) {
    sectionHeader(doc, "Education");
    education.forEach((ed, i) => {
      if (i > 0) doc.moveDown(0.4);
      const range = dateRange(ed.startDate, ed.endDate);
      const degree = [ed.degree, ed.field].filter(Boolean).join(", ");
      doc.font("Helvetica-Bold").fontSize(11).fillColor(ACCENT);
      doc.text(degree || ed.institution || "", { continued: !!range });
      if (range) {
        doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(`   ${range}`, { align: "right" });
      }
      const sub = [ed.institution, ed.grade].filter(Boolean).join(" — ");
      if (sub && degree) doc.font("Helvetica-Oblique").fontSize(10).fillColor(MUTED).text(sub);
    });
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  if (profile.skills?.length) {
    sectionHeader(doc, "Skills");
    doc.font("Helvetica").fontSize(10).fillColor("#111827").text(profile.skills.join("  •  "), {
      lineGap: 2,
    });
  }

  // ── Certifications ──────────────────────────────────────────────────────────
  if (profile.certifications?.length) {
    sectionHeader(doc, "Certifications");
    profile.certifications.forEach((c) => {
      const line = [c.name, c.issuer].filter(Boolean).join(" — ");
      const date = c.date ? `  (${c.date})` : "";
      doc.font("Helvetica").fontSize(10).fillColor("#111827").text(`•  ${line}${date}`, { indent: 10 });
    });
  }

  // ── Projects ────────────────────────────────────────────────────────────────
  if (profile.projects?.length) {
    sectionHeader(doc, "Projects");
    profile.projects.forEach((p, i) => {
      if (i > 0) doc.moveDown(0.3);
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(ACCENT).text(p.name || "");
      if (p.description) doc.font("Helvetica").fontSize(10).fillColor("#111827").text(p.description);
      if (p.technologies?.length) {
        doc.font("Helvetica-Oblique").fontSize(9).fillColor(MUTED).text(p.technologies.join(", "));
      }
    });
  }

  // ── Languages ───────────────────────────────────────────────────────────────
  if (profile.languages?.length) {
    sectionHeader(doc, "Languages");
    const langs = profile.languages
      .map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name))
      .join("  •  ");
    doc.font("Helvetica").fontSize(10).fillColor("#111827").text(langs);
  }

  // ── Awards ──────────────────────────────────────────────────────────────────
  if (profile.awards?.length) {
    sectionHeader(doc, "Awards");
    profile.awards.forEach((a) => {
      const line = [a.title, a.issuer].filter(Boolean).join(" — ");
      const date = a.date ? `  (${a.date})` : "";
      doc.font("Helvetica").fontSize(10).fillColor("#111827").text(`•  ${line}${date}`, { indent: 10 });
    });
  }

  doc.end();
  return bufferPromise;
}

/**
 * Generates a clean text-based PDF for a cover letter. Accepts the HTML body
 * (with <p> tags) and renders it as paragraphs.
 */
export async function generateCoverLetterPDF(opts: {
  content: string;
  candidateName?: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
  const bufferPromise = streamToBuffer(doc);

  if (opts.candidateName) {
    doc.font("Helvetica-Bold").fontSize(16).fillColor(ACCENT).text(opts.candidateName);
    doc.moveDown(0.8);
  }

  // Convert HTML to plain paragraphs.
  const paragraphs = opts.content
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/<\/p>/i)
    .map((block) =>
      block
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;|&rsquo;/g, "'")
        .replace(/&quot;/g, '"')
        .trim()
    )
    .filter(Boolean);

  doc.font("Helvetica").fontSize(11).fillColor("#111827");
  paragraphs.forEach((p, i) => {
    if (i > 0) doc.moveDown(0.8);
    doc.text(p, { align: "left", lineGap: 3 });
  });

  doc.end();
  return bufferPromise;
}
