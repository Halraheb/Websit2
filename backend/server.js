// Backend entry point: JSON API under /api, and the static frontend from ../frontend.
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const { init } = require("./db");

const PORT = process.env.PORT || 3000;

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "20kb" }));

// The site stays up while the database connects, so a missing/wrong DATABASE_URL shows a clear message instead of a crash loop.
let dbError = "جارٍ الاتصال بقاعدة البيانات…";
app.get("/health", (req, res) => res.json({ ok: true, db: dbError ? "error" : "ok", error: dbError || undefined }));
app.use("/api", (req, res, next) => dbError ? res.status(503).json({ error: "قاعدة البيانات غير متصلة: " + dbError }) : next());
app.use(cookieParser());

app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/results"));
app.use("/api", require("./routes/users"));
app.use("/api", require("./routes/students"));
app.use("/api", require("./routes/analytics"));
app.use("/api", (req, res) => res.status(404).json({ error: "غير موجود" }));

app.use(express.static(path.join(__dirname, "..", "frontend"), { extensions: ["html"] }));

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
