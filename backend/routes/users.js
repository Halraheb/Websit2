const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { cleanStage, cleanUsername, USERNAME_RE, publicUser, wrap, auth, staffOnly } = require("../lib");

const router = express.Router();

router.get("/admin/users", auth, staffOnly, wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.username, u.full_name, u.role, u.class_name, u.stage, u.created_at,
           COUNT(r.id)::int AS attempts, MAX(r.percent) AS best,
           (SELECT COUNT(*) FROM achievements a WHERE a.user_id = u.id)::int AS badges
    FROM users u LEFT JOIN results r ON r.user_id = u.id
    GROUP BY u.id ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'teacher' THEN 1 ELSE 2 END, u.class_name NULLS LAST, u.full_name`);
  res.json({ users: rows });
}));

router.post("/admin/users", auth, staffOnly, wrap(async (req, res) => {
  const username = cleanUsername(req.body.username);
  const full_name = String(req.body.full_name || "").trim().slice(0, 80);
  const role = ["student", "teacher", "admin"].includes(req.body.role) ? req.body.role : "student";
  const password = String(req.body.password || "");
  if (role !== "student" && req.user.role !== "admin") return res.status(403).json({ error: "إضافة المعلمين للمدير فقط" });
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: "اسم المستخدم: 3–32 حرفاً إنجليزياً أو أرقاماً" });
  if (!full_name) return res.status(400).json({ error: "الاسم الكامل مطلوب" });
  if (password.length < 6) return res.status(400).json({ error: "كلمة المرور 6 أحرف على الأقل" });
  const { rows } = await pool.query(
    "INSERT INTO users (username, full_name, password_hash, role, class_name, stage) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (username) DO NOTHING RETURNING *",
    [username, full_name, await bcrypt.hash(password, 10), role, String(req.body.class_name || "").trim().slice(0, 40) || null, cleanStage(req.body.stage)]
  );
  if (!rows.length) return res.status(409).json({ error: "اسم المستخدم مستخدم من قبل" });
  res.status(201).json({ user: publicUser(rows[0]) });
}));

async function manageable(req, res) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [parseInt(req.params.id, 10) || 0]);
  const t = rows[0];
  if (!t) { res.status(404).json({ error: "المستخدم غير موجود" }); return null; }
  if (t.id === req.user.id) { res.status(400).json({ error: "لا يمكن تعديل حسابك من هنا" }); return null; }
  if (t.role !== "student" && req.user.role !== "admin") { res.status(403).json({ error: "للمدير فقط" }); return null; }
  return t;
}

router.patch("/admin/users/:id", auth, staffOnly, wrap(async (req, res) => {
  const t = await manageable(req, res); if (!t) return;
  if ("stage" in req.body)
    await pool.query("UPDATE users SET stage = $1 WHERE id = $2", [cleanStage(req.body.stage), t.id]);
  if ("password" in req.body) {
    const password = String(req.body.password || "");
    if (password.length < 6) return res.status(400).json({ error: "كلمة المرور 6 أحرف على الأقل" });
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(password, 10), t.id]);
  }
  res.json({ ok: true });
}));

router.delete("/admin/users/:id", auth, staffOnly, wrap(async (req, res) => {
  const t = await manageable(req, res); if (!t) return;
  await pool.query("DELETE FROM users WHERE id = $1", [t.id]);
  res.json({ ok: true });
}));

module.exports = router;
