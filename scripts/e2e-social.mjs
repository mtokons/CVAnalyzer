// E2E for new features: self-activity, feed+images, public profiles, visibility.
const BASE = process.env.E2E_BASE || "http://localhost:3000";
const EMAIL = process.env.E2E_EMAIL || "mhasnainn@gmail.com";
const PASS = process.env.E2E_PASS || "Htokon@12";
let pass = 0, fail = 0;
const cookies = {};
function ok(n, c, d = "") { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n} ${d}`)); }
function jar() { return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "); }
function store(res) { (res.headers.getSetCookie?.() || []).forEach((c) => { const [kv] = c.split(";"); const [k, v] = kv.split("="); cookies[k] = v; }); }
async function req(path, opts = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", headers: { "Content-Type": "application/json", cookie: jar(), ...(opts.headers || {}) }, ...opts });
  store(res); const t = await res.text(); let b; try { b = t ? JSON.parse(t) : null; } catch { b = t; }
  return { status: res.status, body: b };
}
async function login() {
  const c = await req("/api/auth/csrf"); const csrf = c.body.csrfToken;
  const r = await fetch(BASE + "/api/auth/callback/credentials", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: jar() }, body: new URLSearchParams({ csrfToken: csrf, email: EMAIL, password: PASS }) });
  store(r); ok("login owner", !!cookies["authjs.session-token"] || !!cookies["__Secure-authjs.session-token"], `status ${r.status}`);
}
const px = "data:image/jpeg;base64," + "A".repeat(200);
(async () => {
  await login();
  const me = await req("/api/me/activity"); ok("my activity 200", me.status === 200); ok("logs scoped array", Array.isArray(me.body?.logs));
  const post = await req("/api/feed", { method: "POST", body: JSON.stringify({ text: "E2E hello", imageData: px }) });
  ok("create post 201", post.status === 201, `s${post.status}`); const pid = post.body?.id;
  const cm = await req(`/api/feed/${pid}`, { method: "POST", body: JSON.stringify({ text: "nice", imageData: px }) }); ok("comment 201", cm.status === 201);
  const feed = await req("/api/feed"); ok("feed lists post", feed.body?.posts?.some((p) => p.id === pid));
  const vis = await req("/api/profile/visibility", { method: "PATCH", body: JSON.stringify({ isPublic: true, privateFields: ["phone", "email"] }) });
  ok("visibility patch", vis.status === 200 && vis.body.privateFields.includes("phone"));
  const users = await req("/api/users"); ok("users dir 200", users.status === 200 && Array.isArray(users.body.users));
  const big = await req("/api/feed", { method: "POST", body: JSON.stringify({ text: "x", imageData: "data:image/jpeg;base64," + "A".repeat(500000) }) });
  ok("oversized image rejected", big.status === 400);
  const del = await req(`/api/feed/${pid}`, { method: "DELETE" }); ok("delete own post", del.status === 200);
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
