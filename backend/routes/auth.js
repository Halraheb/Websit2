const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { cleanStage, cleanUsername, USERNAME_RE, publicUser, wrap, setSession, clearSession, auth, rateLimit } = require("../lib");

const router = express.Router();

router.post("/register", rateLimit, wrap(async (req, res) => {
  const username = cleanUsername(req.body.username);
  const full_name = String(req.body.full_name || "").trim().slice(0, 80);
  const class_name = String(req.body.class_name || "").trim().slice(0, 40) || null;
  const password = String(req.body.password || "");
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: "اسم المستخدم: 3–32 حرفاً إنجليزياً أو أرقاماً" });
  if (!full_name) return res.status(400).json({ error: "الاسم الكامل مطلوب" });
  if (password.length < 6) return res.status(400).json({ error: "كلمة المرور 6 أحرف على الأقل" });
  const { rows } = await pool.query(
    "INSERT INTO users (username, full_name, password_hash, class_name, stage) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (username) DO NOTHING RETURNING *",
    [username, full_name, await bcrypt.hash(password, 10), class_name, cleanStage(req.body.stage)]
  );
  if (!rows.length) return res.status(409).json({ error: "اسم المستخدم مستخدم من قبل" });
  setSession(res, rows[0]);
  res.status(201).json({ user: publicUser(rows[0]) });
}));

router.post("/login", rateLimit, wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [cleanUsername(req.body.username)]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(req.body.password || ""), u.password_hash)))
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  setSession(res, u);
  res.json({ user: publicUser(u) });
}));

router.post("/logout", (req, res) => { clearSession(res); res.json({ ok: true }); });
router.get("/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
