const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL غير مضبوط. أضف قاعدة PostgreSQL في Railway أو اضبط المتغير محلياً.");
  process.exit(1);
}

// Railway's internal network doesn't use SSL; its public proxy URL does.
const needsSsl = /sslmode=require/.test(process.env.DATABASE_URL) || process.env.PGSSL === "true";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
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
`;

async function init() {
  await pool.query(SCHEMA);
  const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const { rows } = await pool.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
  if (!rows.length) {
    if (!password) {
      console.warn("لا يوجد مدير بعد: اضبط ADMIN_PASSWORD لإنشاء حساب المدير تلقائياً.");
      return;
    }
    await pool.query(
      "INSERT INTO users (username, full_name, password_hash, role) VALUES ($1, $2, $3, 'admin') ON CONFLICT (username) DO NOTHING",
      [username, process.env.ADMIN_NAME || "مدير النظام", await bcrypt.hash(password, 10)]
    );
    console.log(`تم إنشاء حساب المدير: ${username}`);
  }
}

module.exports = { pool, init };
