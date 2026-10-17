// Student records entered manually by staff (name, class, grade, progress) — independent of user accounts.
const express = require("express");
const { pool } = require("../db");
const { wrap, auth, staffOnly } = require("../lib");

const router = express.Router();

function studentFields(body) {
  const full_name = String(body.full_name || "").trim().slice(0, 80);
  const class_name = String(body.class_name || "").trim().slice(0, 40) || null;
  const notes = String(body.notes || "").trim().slice(0, 300) || null;
  const grade = body.grade === "" || body.grade == null ? null : Number(body.grade);
  const progress = parseInt(body.progress, 10) || 0;
  if (!full_name) return { error: "اسم الطالب مطلوب" };
  if (grade !== null && !(grade >= 0 && grade <= 100)) return { error: "الدرجة بين 0 و 100" };
  if (!(progress >= 0 && progress <= 100)) return { error: "مستوى التقدم بين 0 و 100" };
  return { values: [full_name, class_name, grade, progress, notes] };
}

router.get("/admin/students", auth, staffOnly, wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM students ORDER BY class_name NULLS LAST, full_name");
  res.json({ students: rows });
}));

router.post("/admin/students", auth, staffOnly, wrap(async (req, res) => {
  const f = studentFields(req.body);
  if (f.error) return res.status(400).json({ error: f.error });
  const { rows } = await pool.query(
    "INSERT INTO students (full_name, class_name, grade, progress, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *", f.values);
  res.status(201).json({ student: rows[0] });
}));

router.put("/admin/students/:id", auth, staffOnly, wrap(async (req, res) => {
  const f = studentFields(req.body);
  if (f.error) return res.status(400).json({ error: f.error });
  const { rows } = await pool.query(
    "UPDATE students SET full_name=$1, class_name=$2, grade=$3, progress=$4, notes=$5, updated_at=now() WHERE id=$6 RETURNING *",
    [...f.values, parseInt(req.params.id, 10) || 0]);
  if (!rows.length) return res.status(404).json({ error: "الطالب غير موجود" });
  res.json({ student: rows[0] });
}));

router.delete("/admin/students/:id", auth, staffOnly, wrap(async (req, res) => {
  await pool.query("DELETE FROM students WHERE id = $1", [parseInt(req.params.id, 10) || 0]);
  res.json({ ok: true });
}));

module.exports = router;
