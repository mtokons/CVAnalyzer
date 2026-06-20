/**
 * Portal Automation Service
 * Uses Playwright to auto-fill job application forms on various portals.
 * Human verification step is REQUIRED before any submission.
 */

export interface FillStep {
  action: string;
  field?: string;
  value?: string;
  status: "success" | "failed" | "skipped";
  timestamp: string;
  error?: string;
}

export interface AutoFillResult {
  status: "completed" | "failed" | "partial";
  filledFields: number;
  totalFields: number;
  steps: FillStep[];
  screenshotBase64?: string;
  requiresVerification: boolean;
  message: string;
}

export interface ApplicationFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  currentTitle?: string;
  currentCompany?: string;
  yearsExperience?: string;
  cvFilePath?: string;
  coverLetterText?: string;
  noticePeriod?: string;
  salaryExpectation?: string;
  workAuthorization?: string;
  [key: string]: string | undefined;
}

class PortalAutomationService {
  /**
   * Auto-fill a job application form using Playwright.
   * This ONLY fills the form — it does NOT submit. Human verification is required.
   *
   * @param url - Application portal URL
   * @param formData - Candidate data to fill in
   * @param credentials - Optional portal login credentials
   */
  async fillApplicationForm(
    url: string,
    formData: ApplicationFormData,
    credentials?: { username: string; password: string }
  ): Promise<AutoFillResult> {
    // Playwright must run server-side only
    if (typeof window !== "undefined") {
      throw new Error("Portal automation can only run on the server");
    }

    const steps: FillStep[] = [];
    let filledFields = 0;
    let screenshotBase64: string | undefined;

    const addStep = (step: Omit<FillStep, "timestamp">) => {
      steps.push({ ...step, timestamp: new Date().toISOString() });
    };

    // Browser automation requires a real Chromium process and a human reviewer,
    // neither of which exist on serverless hosts (Firebase App Hosting / Cloud
    // Run, Vercel, etc.). Set DISABLE_AUTOMATION=true there to degrade cleanly.
    if (process.env.DISABLE_AUTOMATION === "true") {
      addStep({
        action: "disabled",
        status: "skipped",
        error: "Auto-fill is disabled in this hosting environment.",
      });
      return {
        status: "failed",
        filledFields: 0,
        totalFields: 0,
        steps,
        requiresVerification: true,
        message:
          "Auto-fill runs a real browser and isn't available on the hosted (serverless) site. " +
          "Run the app locally (npm run dev) to use Playwright auto-fill with human verification.",
      };
    }

    try {
      const { chromium } = await import("playwright");

      // Default is a VISIBLE browser so the user can review before submitting.
      // Set PLAYWRIGHT_HEADLESS=true (e.g. for automated tests/CI) to run hidden.
      const headless = process.env.PLAYWRIGHT_HEADLESS === "true";
      const browser = await chromium.launch({
        headless,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 900 },
      });

      const page = await context.newPage();

      // Navigate to the application URL
      addStep({ action: "navigate", value: url, status: "success" });
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

      // ── Login if credentials provided ───────────────────────────────────
      if (credentials) {
        try {
          await this.handleLogin(page, credentials, addStep);
        } catch (e) {
          addStep({
            action: "login",
            status: "failed",
            error: e instanceof Error ? e.message : "Login failed",
          });
        }
      }

      await page.waitForTimeout(2000);

      // ── Fill form fields ────────────────────────────────────────────────
      const fieldMappings = this.buildFieldMappings(formData);

      for (const mapping of fieldMappings) {
        if (!mapping.value) continue;
        const value = mapping.value;

        try {
          const filled = await this.fillField(page, { selectors: mapping.selectors, value, label: mapping.label });
          if (filled) {
            filledFields++;
            addStep({
              action: "fill",
              field: mapping.label,
              value: mapping.sensitive ? "***" : value,
              status: "success",
            });
          }
        } catch (e) {
          addStep({
            action: "fill",
            field: mapping.label,
            status: "failed",
            error: e instanceof Error ? e.message : "Fill failed",
          });
        }
      }

      // ── Upload CV if path provided ──────────────────────────────────────
      if (formData.cvFilePath) {
        try {
          const fileInputs = page.locator('input[type="file"]');
          const count = await fileInputs.count();
          if (count > 0) {
            await fileInputs.first().setInputFiles(formData.cvFilePath);
            filledFields++;
            addStep({ action: "upload_cv", field: "Resume/CV", status: "success" });
          }
        } catch (e) {
          addStep({
            action: "upload_cv",
            field: "Resume/CV",
            status: "failed",
            error: e instanceof Error ? e.message : "Upload failed",
          });
        }
      }

      // ── Take verification screenshot ─────────────────────────────────────
      const screenshotBuffer = await page.screenshot({ fullPage: true });
      screenshotBase64 = screenshotBuffer.toString("base64");

      // In headful mode keep the browser open for human review — do NOT close
      // automatically; the user must verify and click submit manually.
      // In headless mode (tests/CI) there is no human present, so close it.
      if (headless) {
        await browser.close();
      }
      addStep({
        action: "awaiting_review",
        value: headless
          ? "Form filled (headless mode). Screenshot captured for verification."
          : "Browser left open for human verification. Please review and submit.",
        status: "success",
      });

      return {
        status: "completed",
        filledFields,
        totalFields: fieldMappings.filter((m) => m.value).length,
        steps,
        screenshotBase64,
        requiresVerification: true,
        message: `Successfully filled ${filledFields} fields. Browser is open for your review. Please verify all information and submit manually.`,
      };
    } catch (error) {
      addStep({
        action: "error",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        status: "failed",
        filledFields,
        totalFields: 0,
        steps,
        requiresVerification: true,
        message: error instanceof Error ? error.message : "Automation failed",
      };
    }
  }

  private async handleLogin(
    page: import("playwright").Page,
    credentials: { username: string; password: string },
    addStep: (step: Omit<FillStep, "timestamp">) => void
  ): Promise<void> {
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[id*="email"]',
      'input[placeholder*="email" i]',
    ];

    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id*="password"]',
    ];

    for (const selector of emailSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.fill(credentials.username);
        addStep({ action: "login_email", status: "success" });
        break;
      }
    }

    for (const selector of passwordSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.fill(credentials.password);
        addStep({ action: "login_password", status: "success" });
        break;
      }
    }

    // Click login button
    const loginSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      'button:has-text("Login")',
    ];

    for (const selector of loginSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        await page.waitForLoadState("networkidle");
        addStep({ action: "login_submit", status: "success" });
        break;
      }
    }
  }

  private buildFieldMappings(data: ApplicationFormData): Array<{
    label: string;
    selectors: string[];
    value: string | undefined;
    sensitive?: boolean;
  }> {
    return [
      {
        label: "First Name",
        selectors: [
          'input[name="firstName"]',
          'input[name="first_name"]',
          'input[id*="first"][id*="name"]',
          'input[placeholder*="first name" i]',
          'input[aria-label*="first name" i]',
        ],
        value: data.firstName,
      },
      {
        label: "Last Name",
        selectors: [
          'input[name="lastName"]',
          'input[name="last_name"]',
          'input[id*="last"][id*="name"]',
          'input[placeholder*="last name" i]',
          'input[aria-label*="last name" i]',
        ],
        value: data.lastName,
      },
      {
        label: "Email",
        selectors: [
          'input[type="email"]',
          'input[name="email"]',
          'input[id*="email"]',
          'input[placeholder*="email" i]',
        ],
        value: data.email,
      },
      {
        label: "Phone",
        selectors: [
          'input[type="tel"]',
          'input[name="phone"]',
          'input[name="phoneNumber"]',
          'input[id*="phone"]',
          'input[placeholder*="phone" i]',
        ],
        value: data.phone,
      },
      {
        label: "Location / City",
        selectors: [
          'input[name="location"]',
          'input[name="city"]',
          'input[id*="location"]',
          'input[placeholder*="city" i]',
          'input[placeholder*="location" i]',
        ],
        value: data.location,
      },
      {
        label: "LinkedIn URL",
        selectors: [
          'input[name="linkedin"]',
          'input[name="linkedinUrl"]',
          'input[id*="linkedin"]',
          'input[placeholder*="linkedin" i]',
        ],
        value: data.linkedinUrl,
      },
      {
        label: "Website / Portfolio",
        selectors: [
          'input[name="website"]',
          'input[name="portfolio"]',
          'input[id*="website"]',
          'input[placeholder*="website" i]',
          'input[placeholder*="portfolio" i]',
        ],
        value: data.websiteUrl,
      },
      {
        label: "Current Title",
        selectors: [
          'input[name="currentTitle"]',
          'input[name="current_title"]',
          'input[id*="title"]',
          'input[placeholder*="current title" i]',
        ],
        value: data.currentTitle,
      },
      {
        label: "Current Company",
        selectors: [
          'input[name="currentCompany"]',
          'input[name="current_company"]',
          'input[id*="company"]',
          'input[placeholder*="current company" i]',
        ],
        value: data.currentCompany,
      },
      {
        label: "Cover Letter",
        selectors: [
          'textarea[name="coverLetter"]',
          'textarea[name="cover_letter"]',
          'textarea[id*="cover"]',
          'textarea[placeholder*="cover letter" i]',
        ],
        value: data.coverLetterText,
      },
    ];
  }

  private async fillField(
    page: import("playwright").Page,
    mapping: { selectors: string[]; value: string; label: string }
  ): Promise<boolean> {
    for (const selector of mapping.selectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        await el.fill(mapping.value);
        return true;
      }
    }
    return false;
  }
}

export const portalAutomation = new PortalAutomationService();
