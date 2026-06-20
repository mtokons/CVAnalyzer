/**
 * E2E API test harness for CV Creator.
 *
 * Exercises the real HTTP API against a running dev server (default
 * http://localhost:3000). Run individual feature suites or all of them:
 *
 *   node scripts/e2e.mjs profile
 *   node scripts/e2e.mjs upload
 *   node scripts/e2e.mjs jobs
 *   node scripts/e2e.mjs cv
 *   node scripts/e2e.mjs cover
 *   node scripts/e2e.mjs all
 */

const BASE = process.env.E2E_BASE || "http://localhost:3000";

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? `  (${detail})` : ""}`);
  }
}

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  let body = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

// ─── Suites ───────────────────────────────────────────────────────────────────

async function testProfile() {
  console.log("\n▶ Profile CRUD");

  const get1 = await api("/api/profile");
  ok("GET /api/profile returns 200", get1.status === 200, `status ${get1.status}`);
  ok("profile auto-created with an id", !!get1.body?.id);

  const update = await api("/api/profile", {
    method: "PUT",
    body: JSON.stringify({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+1 555 0100",
      location: "London, UK",
      summary: "Pioneering software engineer.",
      skills: ["JavaScript", "TypeScript", "Algorithms"],
      experience: [
        { company: "Analytical Engine Co", title: "Lead Engineer", startDate: "Jan 2020", current: true, description: "Built the first algorithms." },
      ],
      education: [{ institution: "Royal Society", degree: "Mathematics" }],
    }),
  });
  ok("PUT /api/profile returns 200", update.status === 200, `status ${update.status}`);
  ok("PUT persisted fullName", update.body?.fullName === "Ada Lovelace");
  ok("PUT persisted skills array", Array.isArray(update.body?.skills) && update.body.skills.length === 3);

  const get2 = await api("/api/profile");
  ok("GET reflects persisted data", get2.body?.fullName === "Ada Lovelace");
  ok("GET reflects experience", Array.isArray(get2.body?.experience) && get2.body.experience.length === 1);

  return get2.body;
}

async function testUpload() {
  console.log("\n▶ Document Upload + Parse + Extract");

  const sampleCV = `John Doe
john.doe@example.com
+1 555 0199
San Francisco, CA
https://github.com/johndoe

SUMMARY
Senior Software Engineer with 8 years building scalable web platforms using TypeScript, React and Node.js.

SKILLS
JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, Kubernetes, AWS, GraphQL

EXPERIENCE
Senior Software Engineer at Acme Corp (Jan 2019 - Present)
Software Engineer at Globex (Jun 2016 - Dec 2018)

EDUCATION
BS in Computer Science - Stanford University - 2016
`;

  // Build multipart form-data with a text file.
  const form = new FormData();
  const blob = new Blob([sampleCV], { type: "text/plain" });
  form.append("file", blob, "john-doe-cv.txt");
  form.append("sourceType", "TEXT_UPLOAD");

  const res = await fetch(BASE + "/api/profile/upload", { method: "POST", body: form });
  const body = await res.json().catch(() => null);
  ok("POST /api/profile/upload returns 200", res.status === 200, `status ${res.status}`);
  ok("upload produced a parsed profile", !!body, JSON.stringify(body).slice(0, 200));

  const get = await api("/api/profile");
  const skills = get.body?.skills || [];
  ok("extracted skills merged into profile", skills.length > 0, `skills: ${skills.slice(0, 5).join(", ")}`);
  ok("a profile source was recorded", Array.isArray(get.body?.sources) && get.body.sources.length > 0);

  return get.body;
}

async function testJobs() {
  console.log("\n▶ Jobs: create + analyze + ATS");

  const jobText = `Senior Full Stack Engineer
Company: Initech
Location: Remote
Full-time

We are looking for a Senior Full Stack Engineer.

Requirements:
- 5+ years experience with TypeScript and React
- Strong knowledge of Node.js and PostgreSQL
- Experience with Docker and AWS
- Familiar with GraphQL and CI/CD

Nice to have:
- Kubernetes experience
`;

  const create = await api("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ text: jobText }),
  });
  ok("POST /api/jobs returns 200/201", [200, 201].includes(create.status), `status ${create.status} ${JSON.stringify(create.body).slice(0,150)}`);
  const newJob = create.body?.job;
  const jobId = newJob?.id;
  ok("job created with id", !!jobId);
  ok("job title parsed", typeof newJob?.title === "string" && newJob.title.length > 0, `title=${newJob?.title}`);
  ok("ATS score computed (0-100)", typeof newJob?.atsScore === "number" && newJob.atsScore >= 0 && newJob.atsScore <= 100, `atsScore=${newJob?.atsScore}`);

  const list = await api("/api/jobs");
  ok("GET /api/jobs returns array", Array.isArray(list.body), `status ${list.status}`);
  ok("created job appears in list", (list.body || []).some((j) => j.id === jobId));

  if (jobId) {
    const single = await api(`/api/jobs/${jobId}`);
    ok("GET /api/jobs/:id returns the job", single.body?.id === jobId, `status ${single.status}`);
  }

  return newJob;
}

async function testCV(job) {
  console.log("\n▶ Tailored CV generation");
  if (!job?.id) {
    const j = await testJobsQuiet();
    job = j;
  }
  const gen = await api("/api/cv/generate", {
    method: "POST",
    body: JSON.stringify({ jobId: job.id }),
  });
  ok("POST /api/cv/generate returns 200", gen.status === 200, `status ${gen.status} ${JSON.stringify(gen.body).slice(0,150)}`);
  ok("CV has htmlContent", typeof gen.body?.cvDocument?.htmlContent === "string" && gen.body.cvDocument.htmlContent.includes("<html"), "missing html");
  ok("CV has an ATS score", typeof gen.body?.atsScore === "number", `atsScore=${gen.body?.atsScore}`);
  ok("CV content tailored (has summary)", typeof gen.body?.cvDocument?.content?.summary === "string" && gen.body.cvDocument.content.summary.length > 0);

  const list = await api("/api/cv/generate");
  ok("GET /api/cv/generate lists CV documents", Array.isArray(list.body) && list.body.length > 0, `status ${list.status}`);
  return gen.body;
}

async function testCover(job) {
  console.log("\n▶ Cover letter generation");
  if (!job?.id) {
    job = await testJobsQuiet();
  }
  const gen = await api("/api/cover-letter/generate", {
    method: "POST",
    body: JSON.stringify({ jobId: job.id, tone: "professional" }),
  });
  ok("POST /api/cover-letter/generate returns 200", gen.status === 200, `status ${gen.status} ${JSON.stringify(gen.body).slice(0,150)}`);
  ok("cover letter has content", typeof gen.body?.coverLetter?.content === "string" && gen.body.coverLetter.content.length > 50, "too short");
  ok("cover letter tone recorded", gen.body?.coverLetter?.tone === "professional");

  const list = await api("/api/cover-letter/generate");
  ok("GET lists cover letters", Array.isArray(list.body) && list.body.length > 0, `status ${list.status}`);
  return gen.body;
}

async function testJobsQuiet() {
  const jobText = `Backend Engineer\nCompany: Hooli\nRequirements:\n- 3+ years Node.js and PostgreSQL\n- Docker, AWS\n`;
  const create = await api("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ text: jobText }),
  });
  return create.body?.job;
}

async function testAutomation() {
  console.log("\n▶ Portal auto-fill (headless smoke test)");

  // Ensure a profile exists with fillable data.
  await api("/api/profile", {
    method: "PUT",
    body: JSON.stringify({
      fullName: "Grace Hopper",
      email: "grace@example.com",
      phone: "+1 555 0142",
      location: "New York, USA",
      linkedin: "https://linkedin.com/in/gracehopper",
      skills: ["COBOL", "Compilers", "Leadership"],
      experience: [{ company: "US Navy", title: "Rear Admiral", startDate: "1944", current: true, description: "Pioneered compilers." }],
    }),
  });

  // Create a job pointing at the local test application form.
  const job = await api("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      manual: {
        title: "Senior Engineer",
        company: "TestCorp",
        description: "A test role for E2E automation.",
        applicationUrl: `${BASE}/test-application.html`,
        requirements: ["Node.js", "Leadership"],
        keywords: ["Compilers"],
      },
    }),
  });
  const jobId = job.body?.job?.id;
  ok("job with applicationUrl created", !!jobId, `status ${job.status}`);
  if (!jobId) return;

  const fill = await api("/api/automation/fill", {
    method: "POST",
    body: JSON.stringify({ jobId }),
  });
  ok("POST /api/automation/fill returns 200", fill.status === 200, `status ${fill.status} ${JSON.stringify(fill.body).slice(0, 200)}`);
  ok("automation reports success", fill.body?.success === true, JSON.stringify(fill.body).slice(0, 200));
  ok("fields were filled", typeof fill.body?.filledFields === "number" && fill.body.filledFields > 0, `filledFields=${fill.body?.filledFields}`);
  ok("requires human verification (never auto-submits)", fill.body?.requiresVerification === true);
  return fill.body;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

const suite = process.argv[2] || "all";

(async () => {
  console.log(`E2E target: ${BASE}  |  suite: ${suite}`);
  try {
    let job;
    if (suite === "profile" || suite === "all") await testProfile();
    if (suite === "upload" || suite === "all") await testUpload();
    if (suite === "jobs" || suite === "all") job = await testJobs();
    if (suite === "cv" || suite === "all") await testCV(job);
    if (suite === "cover" || suite === "all") await testCover(job);
    if (suite === "automation" || suite === "all") await testAutomation();
  } catch (e) {
    failed++;
    failures.push("harness error: " + e.message);
    console.error("\nHarness error:", e);
  }

  console.log(`\n──────────────────────────────────`);
  console.log(`  Passed: ${passed}   Failed: ${failed}`);
  if (failures.length) {
    console.log("  Failures:");
    for (const f of failures) console.log("   - " + f);
  }
  process.exit(failed === 0 ? 0 : 1);
})();
