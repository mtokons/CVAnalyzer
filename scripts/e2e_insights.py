#!/usr/bin/env python3
"""E2E test for the Insights feature. Usage: python3 e2e_insights.py BASE_URL"""
import sys, json, time, http.cookiejar, urllib.request, urllib.parse, urllib.error

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
EMAIL = f"insights_{int(time.time())}@gmail.com"
PW = "Test@1234"

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def req(method, path, data=None, form=False, expect=None):
    url = BASE + path
    headers = {}
    body = None
    if data is not None:
        if form:
            body = urllib.parse.urlencode(data).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            body = json.dumps(data).encode()
            headers["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = opener.open(r)
        code = resp.getcode()
        text = resp.read().decode()
    except urllib.error.HTTPError as e:
        code = e.code
        text = e.read().decode()
    if expect and code != expect:
        print(f"  ! {method} {path} -> {code} (expected {expect}) :: {text[:200]}")
    return code, text

def jload(text):
    try: return json.loads(text)
    except: return None

print(f"BASE={BASE}  EMAIL={EMAIL}")

# 1. register + login
c, _ = req("POST", "/api/auth/register", {"name": "Insights Tester", "email": EMAIL, "password": PW})
print("register:", c)
c, t = req("GET", "/api/auth/csrf")
csrf = jload(t)["csrfToken"]
c, _ = req("POST", "/api/auth/callback/credentials", {"csrfToken": csrf, "email": EMAIL, "password": PW, "callbackUrl": BASE + "/dashboard"}, form=True)
print("login:", c)

# 2. rich profile (solution architect signal)
profile = {
    "fullName": "Alex Schmidt", "email": EMAIL, "phone": "+49 170 1234567",
    "location": "Berlin, Deutschland", "linkedin": "linkedin.com/in/alexschmidt",
    "github": "github.com/alexschmidt", "website": "alexschmidt.dev",
    "summary": "Experienced Solution Architect and Software Engineer with 8+ years designing scalable cloud-native systems, microservices and leading cross-functional teams across the German tech market.",
    "skills": ["System Design", "Microservices", "Cloud Architecture", "AWS", "Kubernetes", "Docker", "Terraform", "TypeScript", "Go", "CI/CD", "Domain-Driven Design", "PostgreSQL"],
    "experience": [
        {"company": "TechWerk GmbH", "title": "Senior Solution Architect", "location": "Berlin", "startDate": "2021", "current": True, "description": "Design and delivery of microservice platforms on Kubernetes serving 2M+ users.", "achievements": ["Reduced infra costs by 35%", "Led monolith to event-driven migration"], "technologies": ["AWS", "Kubernetes", "Go", "Kafka"]},
        {"company": "Digital Solutions AG", "title": "Software Engineer", "location": "Munich", "startDate": "2017", "endDate": "2021", "description": "Full-stack development of enterprise web applications.", "achievements": ["Shipped analytics dashboard for 500+ clients"], "technologies": ["React", "Node.js", "PostgreSQL"]},
    ],
    "education": [{"institution": "TU Munich", "degree": "M.Sc. Informatik", "field": "Software Engineering", "startDate": "2014", "endDate": "2016"}],
    "certifications": [{"name": "AWS Solutions Architect Professional", "issuer": "Amazon", "date": "2023"}],
    "projects": [{"name": "Event Platform", "description": "Kafka-based event mesh", "technologies": ["Kafka", "Go"]}],
}
c, _ = req("PUT", "/api/profile", profile)
print("profile PUT:", c)

# 3. create jobs
job_ids = []
for i in range(5):
    c, t = req("POST", "/api/jobs", {"manual": {"title": f"Solution Architect {i}", "company": f"Firma{i} GmbH", "description": "Kubernetes AWS microservices Terraform Go", "requirements": ["AWS", "Kubernetes", "Go"], "keywords": ["aws", "kubernetes", "go", "terraform"]}})
    j = jload(t)
    if j and j.get("job"):
        job_ids.append(j["job"]["id"])
print("jobs created:", len(job_ids))

# 4. set statuses: 2 APPLIED, 1 INTERVIEW, 1 OFFER, 1 stays SAVED
statuses = ["APPLIED", "APPLIED", "INTERVIEW", "OFFER"]
for jid, st in zip(job_ids, statuses):
    c, _ = req("PATCH", f"/api/jobs/{jid}", {"status": st})
print("statuses applied")

# 5. fetch insights
c, t = req("GET", "/api/insights", expect=200)
d = jload(t)
print("insights:", c)
assert d, "no insights body"

ps = d["profileScore"]; fn = d["funnel"]; rf = d["roleFit"]; ct = d["counts"]
print(f"  profileScore: {ps['score']} ({ps['tier']}), sections={len(ps['sections'])}, strengths={len(ps['strengths'])}, suggestions={len(ps['suggestions'])}")
print(f"  funnel: total={fn['total']} applied={fn['applied']} interview={fn['interview']} offers={fn['offers']} responseRate={fn['responseRate']}% interviewRate={fn['interviewRate']}% offerRate={fn['offerRate']}% avgATS={fn['avgAtsScore']}")
print(f"  topRole: {rf[0]['label']} {rf[0]['fitScore']}% (recommended={rf[0]['recommended']}) matched={len(rf[0]['matched'])}")
print(f"  counts: cvs={ct['cvs']} cover={ct['coverLetters']} emails={ct['employerEmails']}")

# assertions
ok = True
def check(name, cond):
    global ok
    print(("  PASS " if cond else "  FAIL ") + name)
    ok = ok and cond

check("profile score >= 70 (rich profile)", ps["score"] >= 70)
check("8 sections present", len(ps["sections"]) == 8)
check("funnel total == 5", fn["total"] == 5)
check("applied == 4 (2 applied+1 int+1 offer)", fn["applied"] == 4)
check("interview == 2 (interview+offer)", fn["interview"] == 2)
check("offers == 1", fn["offers"] == 1)
check("interviewRate == 50%", fn["interviewRate"] == 50)
check("offerRate == 25%", fn["offerRate"] == 25)
check("top role is Solution Architect", rf[0]["id"] == "solution-architect")
check("top role recommended", rf[0]["recommended"] is True)
check("role fit count == 6", len(rf) == 6)
check("avg ATS > 0", fn["avgAtsScore"] > 0)

print("\nRESULT:", "ALL PASS" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
