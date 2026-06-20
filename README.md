# CV Creator — AI-Powered Job Application Suite

Build tailored CVs and cover letters from **any source** (LinkedIn, Monster, uploaded PDFs/Word docs, manual entry), match them against job postings with **ATS scoring**, and **auto-fill application forms** — you just verify and submit.

Powered by **Google Gemini Pro** (and optionally **GitHub Copilot**).

---

## ✨ Features

| Capability | Description |
|---|---|
| **Multi-Source Profile** | Import & merge your profile from LinkedIn, Monster, PDF/DOCX/TXT uploads, or manual entry. AI deduplicates into one master profile. |
| **Job Analysis** | Paste a job URL (LinkedIn, Indeed, Greenhouse, Lever, Workday…) or text. AI extracts requirements, keywords & ATS terms. |
| **ATS Scoring** | Every job gets a 0–100 match score with matched/missing skills and improvement suggestions. |
| **Tailored CVs** | Generate ATS-optimized, job-specific CVs that emphasize your most relevant experience and inject the right keywords. |
| **Cover Letters** | Personalized cover letters in 4 tones (professional, enthusiastic, formal, creative). |
| **Auto-Fill** | Playwright opens the application portal and fills your details. A browser window stays open for **human verification** — nothing is submitted automatically. |
| **Encrypted Credentials** | Portal logins stored with AES-256-GCM, used only during the automation you trigger. |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 16 (App Router)                  │
│                                                              │
│  UI Pages (React 19 + Tailwind + Framer Motion)              │
│   /dashboard  /profile  /jobs  /cv  /cover-letters  /apply   │
│                          │                                   │
│  API Routes (/app/api/*) │                                   │
│   profile · jobs · cv · cover-letter · automation · creds    │
└──────────────────────────┼───────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  AI Service  │  │  Doc Parser  │  │ Portal Automation│
│ (Gemini Pro) │  │ pdf/docx/url │  │   (Playwright)   │
└──────┬───────┘  └──────┬───────┘  └────────┬─────────┘
       │                 │                   │
       └─────────────────┼───────────────────┘
                         ▼
                ┌──────────────────┐
                │  Prisma + Postgres│
                └──────────────────┘
```

### Key directories

```
src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── (app)/                   # Authenticated app shell (sidebar layout)
│   │   ├── dashboard/           # Overview & stats
│   │   ├── profile/             # Multi-source profile builder
│   │   ├── jobs/                # Job tracker + detail (generate CV/CL, auto-apply)
│   │   ├── cv/                  # Generated CVs gallery
│   │   ├── cover-letters/       # Cover letters
│   │   ├── apply/               # Auto-fill applications
│   │   └── settings/            # AI config + encrypted portal credentials
│   └── api/                     # REST endpoints
├── services/
│   ├── ai.service.ts            # Gemini orchestration: extract, analyze, score, generate
│   ├── document-parser.service.ts  # PDF / DOCX / TXT / URL parsing
│   ├── job-scraper.service.ts   # Scrape & analyze job postings
│   └── portal-automation.service.ts  # Playwright form auto-fill (human-in-the-loop)
├── components/                  # UI (Sidebar, ATSScore ring, Loading)
└── lib/                         # prisma client, AES encryption, utils
prisma/schema.prisma             # Data model
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js 20+**
- **PostgreSQL** (local or hosted — e.g. Neon, Supabase, Railway)

### 2. Install dependencies

```bash
npm install
npx playwright install chromium   # for auto-fill automation
```

### 3. Configure environment

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cv_creator?schema=public"

# Google Gemini — get a key at https://aistudio.google.com/apikey
GEMINI_API_KEY="your-gemini-api-key"

# Encryption key for portal credentials — generate with:  openssl rand -hex 32
ENCRYPTION_KEY="your-32-byte-hex-key"

# Optional: GitHub Copilot / OpenAI-compatible
GITHUB_COPILOT_TOKEN="..."
```

### 4. Set up the database

```bash
npm run db:push      # create tables from the schema
# or, with migrations:
npm run db:migrate
```

### 5. Run

```bash
npm run dev
```

Open **http://localhost:3000**.

---

## 🤖 AI Provider Notes

**Gemini Pro** is the default engine (`gemini-1.5-pro`). It powers:
- Profile extraction from raw documents
- Job description analysis & keyword extraction
- ATS match scoring
- CV tailoring & cover letter writing
- Multi-source profile merging

**GitHub Copilot**: Copilot's API is OpenAI-compatible. To route generation through Copilot/OpenAI, add an OpenAI-compatible call in `src/services/ai.service.ts` (a `generateWithCopilot` method mirroring `generateWithGemini`) and switch the provider per task.

---

## 🔒 Security & Safety

- **Human-in-the-loop**: The automation **fills** forms but **never submits**. A visible browser window opens for you to review every field.
- **Encrypted secrets**: Portal credentials use AES-256-GCM (`src/lib/encryption.ts`).
- **Input validation**: File type/size limits on uploads; Zod validation on credentials; URL validation on imports.
- **Respect terms of service**: Only automate portals you're authorized to use. Scraping LinkedIn/Monster may be subject to their ToS — use responsibly.

---

## 📜 Available Scripts

```bash
npm run dev                # start dev server
npm run build              # production build
npm run start              # start production server
npm run db:push            # push schema to DB
npm run db:studio          # open Prisma Studio
npm run db:migrate         # create & run migrations
npm run playwright:install # install Chromium for automation
npm run lint               # lint
```

---

## ☁️ Deploy to Firebase App Hosting (free) + Neon Postgres

This app runs Next.js SSR + API routes on **Firebase App Hosting** (Cloud Run) with a free **Neon** PostgreSQL database.

> **Note on auto-fill:** Playwright browser automation cannot run on serverless
> hosts, so the auto-fill feature degrades gracefully in production (it returns a
> clear message). Everything else — multi-source profiles, document parsing,
> jobs, ATS scoring, CV & cover-letter generation — works fully. Run the app
> locally (`npm run dev`) to use auto-fill.
>
> Firebase App Hosting requires the **Blaze (pay-as-you-go)** billing plan, which
> includes a no-cost free tier; Cloud Run scales to zero when idle.

### 1. Create the database (Neon)

1. Sign up at [neon.tech](https://neon.tech) and create a project (free tier).
2. Copy the **pooled** connection string (it ends with `?sslmode=require`).
3. Push the schema to Neon from your machine:
   ```bash
   DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require" npx prisma db push
   ```

### 2. Push the code to GitHub

App Hosting builds from a GitHub repo. Secrets stay out of git (`.env` is ignored).
```bash
git init && git add . && git commit -m "CV Creator"
git branch -M main
git remote add origin https://github.com/<you>/cv-creator.git
git push -u origin main
```

### 3. Create the App Hosting backend

1. In the [Firebase console](https://console.firebase.google.com), create/select a
   project and upgrade it to the **Blaze** plan.
2. Go to **Build → App Hosting → Get started**, connect your GitHub repo, pick the
   `main` branch and repo root, and choose a region. App Hosting auto-detects
   Next.js and uses [`apphosting.yaml`](apphosting.yaml).

### 4. Set the secrets

Install the CLI and store secrets in Google Secret Manager (referenced by name in
`apphosting.yaml`):
```bash
npm i -g firebase-tools
firebase login
firebase apphosting:secrets:set DATABASE_URL     # paste the Neon URL
firebase apphosting:secrets:set ENCRYPTION_KEY    # openssl rand -hex 32
firebase apphosting:secrets:set GEMINI_API_KEY    # optional — fallback works without it
```
Grant the backend access when prompted (or run `firebase apphosting:secrets:grantaccess`).

### 5. Deploy

Pushing to `main` triggers a build & rollout automatically. Your app goes live at
`https://<backend-id>--<project>.web.app`. To use the live Gemini model later,
just set the `GEMINI_API_KEY` secret — no code change needed.

---

## 🛣️ Roadmap

- [ ] Real authentication (NextAuth — Account/Session models already in schema)
- [ ] PDF export of CVs (currently HTML download/print)
- [ ] More CV templates
- [ ] Background job queue for long automations
- [ ] Per-task AI provider switching (Gemini ↔ Copilot)

---

Built with Next.js, Prisma, Gemini, and Playwright.
