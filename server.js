const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { pool, init } = require("./db");

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.JWT_SECRET) console.warn("JWT_SECRET غير مضبوط: سيُطلب من المستخدمين الدخول مجدداً بعد كل إعادة تشغيل.");
const COOKIE = "session";
const PROD = process.env.NODE_ENV === "production";

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "20kb" }));

// The site stays up while the database connects, so a missing/wrong DATABASE_URL shows a clear message instead of a crash loop.
let dbError = "جارٍ الاتصال بقاعدة البيانات…";
app.get("/health", (req, res) => res.json({ ok: true, db: dbError ? "error" : "ok", error: dbError || undefined }));
app.use("/api", (req, res, next) => dbError ? res.status(503).json({ error: "قاعدة البيانات غير متصلة: " + dbError }) : next());
app.use(cookieParser());

const publicUser = (u) => ({ id: u.id, username: u.username, full_name: u.full_name, role: u.role, class_name: u.class_name });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const cleanUsername = (s) => String(s || "").trim().toLowerCase();
const USERNAME_RE = /^[a-z0-9_.-]{3,32}$/;

function setSession(res, user) {
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "30d" });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: PROD, maxAge: 30 * 24 * 3600 * 1000 });
}

const auth = wrap(async (req, res, next) => {
  let id;
  try { id = jwt.verify(req.cookies[COOKIE] || "", SECRET).id; } catch { return res.status(401).json({ error: "يجب تسجيل الدخول" }); }
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  if (!rows.length) return res.status(401).json({ error: "يجب تسجيل الدخول" });
  req.user = rows[0];
  next();
});
const staffOnly = (req, res, next) =>
  req.user.role === "student" ? res.status(403).json({ error: "هذه الصفحة للمعلمين فقط" }) : next();

// Simple in-memory brute-force guard for login/register.
const attempts = new Map();
function rateLimit(req, res, next) {
  const key = req.ip, now = Date.now();
  const a = (attempts.get(key) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (a.length >= 20) return res.status(429).json({ error: "محاولات كثيرة، حاول بعد قليل" });
  a.push(now); attempts.set(key, a); next();
}

// ---------- auth ----------
app.post("/api/register", rateLimit, wrap(async (req, res) => {
  const username = cleanUsername(req.body.username);
  const full_name = String(req.body.full_name || "").trim().slice(0, 80);
  const class_name = String(req.body.class_name || "").trim().slice(0, 40) || null;
  const password = String(req.body.password || "");
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: "اسم المستخدم: 3–32 حرفاً إنجليزياً أو أرقاماً" });
  if (!full_name) return res.status(400).json({ error: "الاسم الكامل مطلوب" });
  if (password.length < 6) return res.status(400).json({ error: "كلمة المرور 6 أحرف على الأقل" });
  const { rows } = await pool.query(
    "INSERT INTO users (username, full_name, password_hash, class_name) VALUES ($1,$2,$3,$4) ON CONFLICT (username) DO NOTHING RETURNING *",
    [username, full_name, await bcrypt.hash(password, 10), class_name]
  );
  if (!rows.length) return res.status(409).json({ error: "اسم المستخدم مستخدم من قبل" });
  setSession(res, rows[0]);
  res.status(201).json({ user: publicUser(rows[0]) });
}));

app.post("/api/login", rateLimit, wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [cleanUsername(req.body.username)]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(req.body.password || ""), u.password_hash)))
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  setSession(res, u);
  res.json({ user: publicUser(u) });
}));

app.post("/api/logout", (req, res) => { res.clearCookie(COOKIE); res.json({ ok: true }); });
app.get("/api/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

// ---------- grades ----------
app.post("/api/results", auth, wrap(async (req, res) => {
  const total = parseInt(req.body.total, 10), score = parseInt(req.body.score, 10), level = parseInt(req.body.level, 10) || 0;
  if (!(total > 0 && total <= 500 && score >= 0 && score <= total && level >= 0 && level <= 3))
    return res.status(400).json({ error: "بيانات الدرجة غير صحيحة" });
  const { rows } = await pool.query(
    "INSERT INTO results (user_id, score, total, percent, level) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [req.user.id, score, total, Math.round((score / total) * 100), level]
  );
  res.status(201).json({ result: rows[0] });
}));

app.get("/api/results/me", auth, wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM results WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
  res.json({ results: rows });
}));

const ALL_RESULTS = `SELECT r.*, u.full_name, u.username, u.class_name FROM results r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC`;
app.get("/api/admin/results", auth, staffOnly, wrap(async (req, res) => {
  res.json({ results: (await pool.query(ALL_RESULTS)).rows });
}));

app.get("/api/admin/results.csv", auth, staffOnly, wrap(async (req, res) => {
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["الطالب", "اسم المستخدم", "الصف", "الدرجة", "من", "النسبة", "المستوى", "التاريخ"].map(q).join(",")];
  for (const r of (await pool.query(ALL_RESULTS)).rows)
    lines.push([r.full_name, r.username, r.class_name, r.score, r.total, r.percent + "%", r.level, r.created_at.toISOString()].map(q).join(","));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="grades.csv"');
  res.send("﻿" + lines.join("\n"));
}));

app.delete("/api/admin/results/:id", auth, staffOnly, wrap(async (req, res) => {
  await pool.query("DELETE FROM results WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));

// ---------- users ----------
app.get("/api/admin/users", auth, staffOnly, wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.username, u.full_name, u.role, u.class_name, u.created_at,
           COUNT(r.id)::int AS attempts, MAX(r.percent) AS best
    FROM users u LEFT JOIN results r ON r.user_id = u.id
    GROUP BY u.id ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'teacher' THEN 1 ELSE 2 END, u.class_name NULLS LAST, u.full_name`);
  res.json({ users: rows });
}));

app.post("/api/admin/users", auth, staffOnly, wrap(async (req, res) => {
  const username = cleanUsername(req.body.username);
  const full_name = String(req.body.full_name || "").trim().slice(0, 80);
  const role = ["student", "teacher", "admin"].includes(req.body.role) ? req.body.role : "student";
  const password = String(req.body.password || "");
  if (role !== "student" && req.user.role !== "admin") return res.status(403).json({ error: "إضافة المعلمين للمدير فقط" });
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: "اسم المستخدم: 3–32 حرفاً إنجليزياً أو أرقاماً" });
  if (!full_name) return res.status(400).json({ error: "الاسم الكامل مطلوب" });
  if (password.length < 6) return res.status(400).json({ error: "كلمة المرور 6 أحرف على الأقل" });
  const { rows } = await pool.query(
    "INSERT INTO users (username, full_name, password_hash, role, class_name) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (username) DO NOTHING RETURNING *",
    [username, full_name, await bcrypt.hash(password, 10), role, String(req.body.class_name || "").trim().slice(0, 40) || null]
  );
  if (!rows.length) return res.status(409).json({ error: "اسم المستخدم مستخدم من قبل" });
  res.status(201).json({ user: publicUser(rows[0]) });
}));

async function manageable(req, res) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
  const t = rows[0];
  if (!t) { res.status(404).json({ error: "المستخدم غير موجود" }); return null; }
  if (t.id === req.user.id) { res.status(400).json({ error: "لا يمكن تعديل حسابك من هنا" }); return null; }
  if (t.role !== "student" && req.user.role !== "admin") { res.status(403).json({ error: "للمدير فقط" }); return null; }
  return t;
}

app.patch("/api/admin/users/:id", auth, staffOnly, wrap(async (req, res) => {
  const t = await manageable(req, res); if (!t) return;
  const password = String(req.body.password || "");
  if (password.length < 6) return res.status(400).json({ error: "كلمة المرور 6 أحرف على الأقل" });
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(password, 10), t.id]);
  res.json({ ok: true });
}));

app.delete("/api/admin/users/:id", auth, staffOnly, wrap(async (req, res) => {
  const t = await manageable(req, res); if (!t) return;
  await pool.query("DELETE FROM users WHERE id = $1", [t.id]);
  res.json({ ok: true });
}));

app.use(express.static(path.join(__dirname, "public")));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "خطأ في الخادم" });
});

app.listen(PORT, () => console.log(`الموقع يعمل على المنفذ ${PORT}`));

(async function connect() {
  try {
    await init();
    dbError = null;
    console.log("تم الاتصال بقاعدة البيانات");
  } catch (e) {
    dbError = e.message;
    console.error("فشل الاتصال بقاعدة البيانات:", e.message, "— إعادة المحاولة بعد 10 ثوانٍ");
    setTimeout(connect, 10000);
  }
})();
