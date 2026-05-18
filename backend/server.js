import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// ── Load env FIRST ────────────────────────────────────────────────────────────
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Print critical env vars (masked) ─────────────────────────────────────────
function maskVal(v) { return v ? v.slice(0,6)+"..." : "❌ NOT SET"; }
console.log("══════════════ ENV CHECK ══════════════");
console.log(`NODE_ENV           : ${process.env.NODE_ENV || "development"}`);
console.log(`DATA_PATH          : ${process.env.DATA_PATH || "❌ NOT SET"}`);
console.log(`JWT_SECRET         : ${maskVal(process.env.JWT_SECRET)}`);
console.log(`ANTHROPIC_API_KEY  : ${maskVal(process.env.ANTHROPIC_API_KEY)}`);
console.log(`RESEND_API_KEY     : ${maskVal(process.env.RESEND_API_KEY)}`);
console.log(`GOOGLE_CLIENT_ID   : ${process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.slice(0,20)+"..." : "❌ NOT SET"}`);
console.log(`VITE_GOOGLE_CLIENT : ${process.env.VITE_GOOGLE_CLIENT_ID ? process.env.VITE_GOOGLE_CLIENT_ID.slice(0,20)+"..." : "❌ NOT SET"}`);
console.log(`APP_URL            : ${process.env.APP_URL || "❌ NOT SET"}`);
console.log("═══════════════════════════════════════");

// ── Set DATA_ROOT before DB module initializes ────────────────────────────────
// CRITICAL: database.js reads DATA_ROOT at module evaluation time.
// We must set it here before the static imports below execute their top-level code.
// In ESM, top-level code in imported modules runs when first imported.
// Setting the env var here works because dotenv + this assignment runs
// before any imported module's top-level code that reads it.
const DATA_ROOT = process.env.DATA_PATH || path.join(__dirname, "..");
process.env.DATA_ROOT = DATA_ROOT;

// Create directories on volume
["data", "uploads", "sessions"].forEach((dir) => {
  const fullPath = path.join(DATA_ROOT, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`📁 ${dir}: ${fullPath}`);
});

import { initDb } from "./db/database.js";
import authRoutes from "./routes/auth.js";
import configRoutes from "./routes/config.js";
import botRoutes from "./routes/bot.js";
import adminRoutes from "./routes/admin.js";
import { restoreActiveBots } from "./routes/botEngine.js";
import { verifyEmailConfig } from "./services/email.js";

initDb();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth",   authRoutes);
app.use("/api/config", configRoutes);
app.use("/api/bot",    botRoutes);
app.use("/api/admin",  adminRoutes);

app.get("/api/health", (_, res) => res.json({
  status: "ok", timestamp: new Date().toISOString(), data_root: DATA_ROOT,
}));

app.get("/verify-email", (req, res) =>
  res.redirect(`/api/auth/verify-email?token=${req.query.token || ""}`)
);

// ── TEMP ADMIN SETUP ──────────────────────────────────────────────────────────
app.get("/api/setup-admin", async (req, res) => {
  const { secret, email, password, name } = req.query;
  if (!secret || secret !== process.env.JWT_SECRET?.slice(0, 12))
    return res.status(403).json({ error: "Forbidden" });
  if (!email || !password || !name)
    return res.status(400).json({ error: "Provide email, password, name" });
  try {
    const bcrypt = (await import("bcryptjs")).default;
    const { default: db } = await import("./db/database.js");
    const hashed = await bcrypt.hash(password, 10);
    db.prepare("INSERT OR REPLACE INTO users (email,password,name,is_admin,is_active,is_verified) VALUES (?,?,?,1,1,1)")
      .run(email, hashed, name);
    const user = db.prepare("SELECT id,email,is_admin FROM users WHERE email=?").get(email);
    console.log(`✅ Admin created: ${email}`);
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ── END TEMP ──────────────────────────────────────────────────────────────────

// ── Runtime env config for frontend ──────────────────────────────────────────
app.get("/api/config/env.js", (_, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache, no-store");
  res.send(`window.__ENV__ = ${JSON.stringify({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "",
  })};`);
});

const FRONTEND_DIST = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
  console.log("🌐 Serving React frontend from:", FRONTEND_DIST);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("\n" + "=".repeat(50));
  console.log(`🚀 WhatsApp AI SaaS`);
  console.log(`🌍 Port          : ${PORT}`);
  console.log(`🔑 JWT_SECRET    : ${process.env.JWT_SECRET ? "✅ Set" : "❌ MISSING!"}`);
  console.log(`🤖 ANTHROPIC_KEY : ${process.env.ANTHROPIC_API_KEY ? "✅ Set" : "❌ MISSING!"}`);
  console.log(`📁 Data root     : ${DATA_ROOT}`);
  console.log("=".repeat(50) + "\n");
  restoreActiveBots();
  verifyEmailConfig();
});
