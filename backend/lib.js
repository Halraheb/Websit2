// Shared helpers: sessions, auth middleware, input cleaning.
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { pool } = require("./db");

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.JWT_SECRET) console.warn("JWT_SECRET غير مضبوط: سيُطلب من المستخدمين الدخول مجدداً بعد كل إعادة تشغيل.");
const COOKIE = "session";
const PROD = process.env.NODE_ENV === "production";

const STAGES = ["أول ثانوي", "ثاني ثانوي", "ثالث ثانوي"];
const cleanStage = (s) => (STAGES.includes(s) ? s : null);
const cleanUsername = (s) => String(s || "").trim().toLowerCase();
const USERNAME_RE = /^[a-z0-9_.-]{3,32}$/;
const publicUser = (u) => ({ id: u.id, username: u.username, full_name: u.full_name, role: u.role, class_name: u.class_name, stage: u.stage, created_at: u.created_at });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function setSession(res, user) {
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "30d" });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: PROD, maxAge: 30 * 24 * 3600 * 1000 });
}
const clearSession = (res) => res.clearCookie(COOKIE);

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

module.exports = { STAGES, cleanStage, cleanUsername, USERNAME_RE, publicUser, wrap, setSession, clearSession, auth, staffOnly, rateLimit };
