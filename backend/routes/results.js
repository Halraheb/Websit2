const express = require("express");
const { pool } = require("../db");
const { wrap, auth, staffOnly } = require("../lib");
const { evaluate } = require("../achievements");

const router = express.Router();

router.post("/results", auth, wrap(async (req, res) => {
  const total = parseInt(req.body.total, 10), score = parseInt(req.body.score, 10), level = parseInt(req.body.level, 10) || 0;
  if (!(total > 0 && total <= 500 && score >= 0 && score <= total && level >= 0 && level <= 3))
    return res.status(400).json({ error: "بيانات الدرجة غير صحيحة" });
  const answers = Array.isArray(req.body.answers) ? req.body.answers.slice(0, total) : [];
  const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  const valid = answers.filter((a) => a && int(a.q, 0, 10000) && int(a.s, 1, 3) && int(a.d, 1, 3) && typeof a.k === "string");
  const client = await pool.connect();
  let result;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "INSERT INTO results (user_id, score, total, percent, level) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [req.user.id, score, total, Math.round((score / total) * 100), level]
    );
    if (valid.length)
      await client.query(
        `INSERT INTO answers (result_id, user_id, q_index, section, level, skill, picked, correct)
         SELECT $1, $2, * FROM unnest($3::int[], $4::int[], $5::int[], $6::text[], $7::int[], $8::bool[])`,
        [rows[0].id, req.user.id, valid.map((a) => a.q), valid.map((a) => a.s), valid.map((a) => a.d),
         valid.map((a) => a.k.slice(0, 60)), valid.map((a) => (int(a.p, 0, 3) ? a.p : null)), valid.map((a) => a.ok === true)]
      );
    await client.query("COMMIT");
    result = rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  const { new_achievements, level: xpLevel } = await evaluate(req.user.id);
  res.status(201).json({ result, new_achievements, level: xpLevel });
}));

router.get("/results/me", auth, wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM results WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
  res.json({ results: rows });
}));

const ALL_RESULTS = `SELECT r.*, u.full_name, u.username, u.class_name FROM results r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC`;
router.get("/admin/results", auth, staffOnly, wrap(async (req, res) => {
  res.json({ results: (await pool.query(ALL_RESULTS)).rows });
}));

router.get("/admin/results.csv", auth, staffOnly, wrap(async (req, res) => {
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["الطالب", "اسم المستخدم", "الصف", "الدرجة", "من", "النسبة", "المستوى", "التاريخ"].map(q).join(",")];
  for (const r of (await pool.query(ALL_RESULTS)).rows)
    lines.push([r.full_name, r.username, r.class_name, r.score, r.total, r.percent + "%", r.level, r.created_at.toISOString()].map(q).join(","));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="grades.csv"');
  res.send("﻿" + lines.join("\n"));
}));

router.delete("/admin/results/:id", auth, staffOnly, wrap(async (req, res) => {
  await pool.query("DELETE FROM results WHERE id = $1", [parseInt(req.params.id, 10) || 0]);
  res.json({ ok: true });
}));

module.exports = router;
