// Skills analytics (strengths/weaknesses) and the student profile.
const express = require("express");
const { pool } = require("../db");
const { publicUser, wrap, auth, staffOnly } = require("../lib");
const { evaluate } = require("../achievements");

const router = express.Router();

// Per student, per stage, or school-wide.
async function analytics({ userId = null, stage = null }) {
  // $1 = user id filter, $2 = stage filter ('' = unassigned stage); null means "all".
  const where = `WHERE u.role = 'student' AND ($1::int IS NULL OR u.id = $1)
    AND ($2::text IS NULL OR COALESCE(u.stage, '') = $2)`;
  const p = [userId, stage];
  const acc = "COUNT(*)::int AS answered, COUNT(*) FILTER (WHERE a.correct)::int AS correct";
  const q = (sql) => pool.query(sql, p).then((r) => r.rows);
  const [kpi, bySection, byLevel, bySkill, questions, students, byStage, timeline] = await Promise.all([
    q(`SELECT COUNT(DISTINCT u.id)::int AS students, COUNT(r.id)::int AS attempts, ROUND(AVG(r.percent))::int AS avg_percent
       FROM users u LEFT JOIN results r ON r.user_id = u.id ${where}`),
    q(`SELECT a.section, ${acc} FROM answers a JOIN users u ON u.id = a.user_id ${where} GROUP BY 1 ORDER BY 1`),
    q(`SELECT a.level, ${acc} FROM answers a JOIN users u ON u.id = a.user_id ${where} GROUP BY 1 ORDER BY 1`),
    q(`SELECT a.skill, MIN(a.section) AS section, ${acc} FROM answers a JOIN users u ON u.id = a.user_id ${where} GROUP BY 1`),
    q(`SELECT a.q_index, ${acc}, MODE() WITHIN GROUP (ORDER BY a.picked) FILTER (WHERE NOT a.correct AND a.picked IS NOT NULL) AS common_wrong
       FROM answers a JOIN users u ON u.id = a.user_id ${where} GROUP BY 1
       HAVING COUNT(*) FILTER (WHERE NOT a.correct) > 0
       ORDER BY COUNT(*) FILTER (WHERE NOT a.correct) DESC, COUNT(*) FILTER (WHERE NOT a.correct)::float / COUNT(*) DESC LIMIT 12`),
    userId ? [] : q(`SELECT u.id, u.full_name, u.class_name, u.stage, COUNT(DISTINCT r.id)::int AS attempts,
         ROUND(AVG(r.percent))::int AS avg_percent,
         (SELECT COUNT(*) FROM answers a WHERE a.user_id = u.id)::int AS answered,
         (SELECT COUNT(*) FROM answers a WHERE a.user_id = u.id AND a.correct)::int AS correct,
         (SELECT COUNT(*) FROM achievements a WHERE a.user_id = u.id)::int AS badges
       FROM users u LEFT JOIN results r ON r.user_id = u.id ${where} GROUP BY u.id ORDER BY avg_percent DESC NULLS LAST, u.full_name`),
    userId || stage !== null ? [] : q(`SELECT COALESCE(u.stage, '') AS stage, COUNT(DISTINCT u.id)::int AS students, ${acc}
       FROM users u JOIN answers a ON a.user_id = u.id ${where} GROUP BY 1 ORDER BY 1`),
    userId ? q(`SELECT r.created_at, r.percent, r.score, r.total FROM results r JOIN users u ON u.id = r.user_id ${where} ORDER BY r.created_at`) : [],
  ]);
  return { kpi: kpi[0], bySection, byLevel, bySkill, questions, students, byStage, timeline };
}

router.get("/admin/analytics", auth, staffOnly, wrap(async (req, res) => {
  const userId = parseInt(req.query.user_id, 10) || null;
  const stage = typeof req.query.stage === "string" ? req.query.stage : null;
  const data = await analytics({ userId, stage });
  if (userId) {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    data.student = rows[0] ? publicUser(rows[0]) : null;
  }
  res.json(data);
}));

router.get("/analytics/me", auth, wrap(async (req, res) => {
  res.json({ ...(await analytics({ userId: req.user.id })), student: publicUser(req.user) });
}));

// Everything the profile page shows: identity, level/XP, achievements, skills analytics, recent results.
async function profile(user) {
  const [ach, an, recent] = await Promise.all([
    evaluate(user.id),
    analytics({ userId: user.id }),
    pool.query("SELECT * FROM results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15", [user.id]),
  ]);
  return { student: publicUser(user), stats: ach.stats, level: ach.level, achievements: ach.achievements, analytics: an, recent: recent.rows };
}

router.get("/profile/me", auth, wrap(async (req, res) => res.json(await profile(req.user))));

router.get("/admin/profile/:id", auth, staffOnly, wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [parseInt(req.params.id, 10) || 0]);
  if (!rows.length) return res.status(404).json({ error: "المستخدم غير موجود" });
  res.json(await profile(rows[0]));
}));

module.exports = router;
