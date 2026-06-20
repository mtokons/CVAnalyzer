/**
 * Document Parser Service
 * Handles PDF, Word (.docx), plain text, and URL-based document ingestion
 */

import { aiService, type ProfileData } from "./ai.service";

export type DocumentType = "pdf" | "docx" | "txt" | "url";

export interface ParseResult {
  rawText: string;
  parsedProfile: ProfileData;
  sourceType: string;
}

class DocumentParserService {
  /**
   * Parse a PDF buffer and extract profile data
   */
  async parsePDF(buffer: Buffer): Promise<ParseResult> {
    // pdf-parse v2 exposes a PDFParse class (ESM)
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    const rawText = result.text;
    const parsedProfile = await aiService.extractProfileFromText(rawText, "PDF CV/Resume");
    return { rawText, parsedProfile, sourceType: "PDF" };
  }

  /**
   * Parse a .docx Word document buffer and extract profile data
   */
  async parseDocx(buffer: Buffer): Promise<ParseResult> {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value;
    const parsedProfile = await aiService.extractProfileFromText(rawText, "Word Document CV/Resume");
    return { rawText, parsedProfile, sourceType: "DOCX" };
  }

  /**
   * Parse plain text content
   */
  async parsePlainText(text: string): Promise<ParseResult> {
    const parsedProfile = await aiService.extractProfileFromText(text, "Text CV/Resume");
    return { rawText: text, parsedProfile, sourceType: "TEXT" };
  }

  /**
   * Fetch and parse content from a URL (LinkedIn, job portal, etc.)
   */
  async parseFromURL(url: string, type: "profile" | "job" = "profile"): Promise<ParseResult> {
    const axios = (await import("axios")).default;
    const cheerio = await import("cheerio");

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Remove scripts, styles, navigation, ads
    $("script, style, nav, footer, header, .ads, .advertisement, [aria-hidden='true']").remove();

    // Extract main content
    const rawText = $("body").text().replace(/\s+/g, " ").trim();

    const sourceLabel =
      url.includes("linkedin.com") ? "LinkedIn Profile" :
      url.includes("monster.com") ? "Monster Profile" :
      url.includes("indeed.com") ? "Indeed Job Posting" :
      type === "job" ? "Job Posting" : "Online Profile";

    const parsedProfile = await aiService.extractProfileFromText(rawText, sourceLabel);
    return { rawText, parsedProfile, sourceType: "URL" };
  }

  /**
   * Auto-detect document type and parse accordingly
   */
  async parseFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<ParseResult> {
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (mimeType === "application/pdf" || ext === "pdf") {
      return this.parsePDF(buffer);
    }

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "docx"
    ) {
      return this.parseDocx(buffer);
    }

    if (mimeType === "text/plain" || ext === "txt") {
      return this.parsePlainText(buffer.toString("utf-8"));
    }

    throw new Error(`Unsupported file type: ${mimeType || ext}`);
  }
}

export const documentParser = new DocumentParserService();
