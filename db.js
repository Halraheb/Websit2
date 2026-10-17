const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

// Railway's internal network doesn't use SSL; its public proxy URL does.
const needsSsl = /sslmode=require/.test(process.env.DATABASE_URL || "") || process.env.PGSSL === "true";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  class_name    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS results (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL CHECK (score >= 0),
  total      INTEGER NOT NULL CHECK (total > 0),
  percent    INTEGER NOT NULL,
  level      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS results_user_idx ON results(user_id, created_at DESC);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stage TEXT;
CREATE TABLE IF NOT EXISTS answers (
  id         SERIAL PRIMARY KEY,
  result_id  INTEGER NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  q_index    INTEGER NOT NULL,
  section    INTEGER NOT NULL,
  level      INTEGER NOT NULL,
  skill      TEXT NOT NULL,
  picked     INTEGER,
  correct    BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS answers_user_idx ON answers(user_id);
CREATE TABLE IF NOT EXISTS students (
  id         SERIAL PRIMARY KEY,
  full_name  TEXT NOT NULL,
  class_name TEXT,
  grade      REAL CHECK (grade >= 0 AND grade <= 100),
  progress   INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function init() {
  if (!process.env.DATABASE_URL)
    throw new Error("المتغير DATABASE_URL غير مضبوط: أضف قاعدة PostgreSQL في Railway واربطها بالمتغير ${{Postgres.DATABASE_URL}}");
  if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL))
    throw new Error(`قيمة DATABASE_URL ليست رابط قاعدة بيانات (القيمة الحالية: "${process.env.DATABASE_URL.slice(0, 60)}"). احذفها وأضفها من Variables ← Add Reference ← Postgres ← DATABASE_URL`);
  await pool.query(SCHEMA);
  // ADMIN_USERNAME / ADMIN_PASSWORD are the source of truth: create the admin, or reset its password and role, on every start.
  const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD || "").trim();
  if (!password) {
    console.warn("ADMIN_PASSWORD غير مضبوط: لن يُنشأ أو يُحدّث حساب المدير.");
    return;
  }
  await pool.query(
    `INSERT INTO users (username, full_name, password_hash, role) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [username, process.env.ADMIN_NAME || "مدير النظام", await bcrypt.hash(password, 10)]
  );
  console.log(`حساب المدير جاهز: ${username}`);
}

module.exports = { pool, init };
