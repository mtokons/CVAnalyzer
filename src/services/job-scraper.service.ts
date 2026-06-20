/**
 * Job Scraper Service
 * Scrapes job details from portals: LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, etc.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { aiService, type JobDetails } from "./ai.service";

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  jobType: string;
  salary: string;
  description: string;
  requirements: string[];
  keywords: string[];
  niceToHave: string[];
  portalName: string;
  portalUrl: string;
  applicationUrl: string;
  rawText: string;
}

class JobScraperService {
  private readonly httpClient = axios.create({
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  private detectPortal(url: string): string {
    if (url.includes("linkedin.com")) return "LinkedIn";
    if (url.includes("indeed.com")) return "Indeed";
    if (url.includes("glassdoor.com")) return "Glassdoor";
    if (url.includes("monster.com")) return "Monster";
    if (url.includes("greenhouse.io")) return "Greenhouse";
    if (url.includes("lever.co")) return "Lever";
    if (url.includes("workday.com")) return "Workday";
    if (url.includes("smartrecruiters.com")) return "SmartRecruiters";
    if (url.includes("jobvite.com")) return "Jobvite";
    if (url.includes("ziprecruiter.com")) return "ZipRecruiter";
    if (url.includes("reed.co.uk")) return "Reed";
    if (url.includes("totaljobs.com")) return "TotalJobs";
    if (url.includes("cwjobs.co.uk")) return "CWJobs";
    return "Job Portal";
  }

  private extractTextFromHTML(html: string): string {
    const $ = cheerio.load(html);

    // Remove non-content elements
    $(
      "script, style, nav, footer, header, .cookie-banner, .advertisement, [aria-hidden='true'], .modal"
    ).remove();

    // Try to find the main job content area
    const jobSelectors = [
      ".job-description",
      '[data-testid="job-description"]',
      ".description__text",
      "#job-details",
      ".jobsearch-jobDescriptionText",
      ".job-detail-description",
      'article[class*="job"]',
      'section[class*="job"]',
      "main",
    ];

    for (const selector of jobSelectors) {
      const content = $(selector).text();
      if (content && content.length > 200) {
        return content.replace(/\s+/g, " ").trim();
      }
    }

    return $("body").text().replace(/\s+/g, " ").trim();
  }

  /**
   * Scrape a job posting from any URL
   */
  async scrapeJobFromURL(url: string): Promise<ScrapedJob> {
    const response = await this.httpClient.get(url);
    const rawText = this.extractTextFromHTML(response.data);
    const portalName = this.detectPortal(url);

    // Use AI to extract structured job data
    const analysis = await aiService.analyzeJobDescription(rawText);

    return {
      title: analysis.title,
      company: analysis.company,
      location: analysis.location,
      jobType: analysis.jobType,
      salary: analysis.salary,
      description: rawText.slice(0, 5000), // Store first 5000 chars
      requirements: analysis.requirements,
      keywords: analysis.keywords,
      niceToHave: analysis.niceToHave,
      portalName,
      portalUrl: url,
      applicationUrl: url,
      rawText,
    };
  }

  /**
   * Parse a pasted job description text
   */
  async parseJobDescription(text: string): Promise<ScrapedJob> {
    const analysis = await aiService.analyzeJobDescription(text);

    return {
      title: analysis.title,
      company: analysis.company,
      location: analysis.location,
      jobType: analysis.jobType,
      salary: analysis.salary,
      description: text,
      requirements: analysis.requirements,
      keywords: analysis.keywords,
      niceToHave: analysis.niceToHave,
      portalName: "Manual",
      portalUrl: "",
      applicationUrl: "",
      rawText: text,
    };
  }

  /**
   * Convert scraped job to JobDetails format for AI processing
   */
  toJobDetails(job: ScrapedJob): JobDetails {
    return {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      requirements: job.requirements,
      keywords: job.keywords,
    };
  }
}

export const jobScraper = new JobScraperService();
