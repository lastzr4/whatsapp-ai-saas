import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

import { initDb } from "./db/database.js";
import authRoutes from "./routes/auth.js";
import configRoutes from "./routes/config.js";
import botRoutes from "./routes/bot.js";
import adminRoutes from "./routes/admin.js";
import { restoreActiveBots } from "./routes/botEngine.js";
import { verifyEmailConfig } from "./services/email.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Data directories ──────────────────────────────────────────────────────────
// In production, set DATA_PATH to your Railway volume mount path e.g. /data
const DATA_ROOT = process.env.DATA_PATH || path.join(__dirname, "..");
["data", "uploads", "sessions"].forEach((dir) => {
  const fullPath = path.join(DATA_ROOT, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`📁 ${dir}: ${fullPath}`);
});
process.env.DATA_ROOT = DATA_ROOT;

initDb();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",   authRoutes);
app.use("/api/config", configRoutes);
app.use("/api/bot",    botRoutes);
app.use("/api/admin",  adminRoutes);
app.get("/api/health", (_, res) => res.json({
  status: "ok",
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV || "development",
}));

// ── TEMPORARY ADMIN SETUP — remove after first use ────────────────────────────
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
    db.prepare(`INSERT OR REPLACE INTO users
      (email,password,name,is_admin,is_active,is_verified) VALUES (?,?,?,1,1,1)`)
      .run(email, hashed, name);
    const user = db.prepare("SELECT id,email,is_admin FROM users WHERE email=?").get(email);
    console.log(`✅ Admin created via endpoint: ${email}`);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── END TEMPORARY ─────────────────────────────────────────────────────────────

// Email verification link — GET /verify-email?token=xxx
// Auth router handles this, but we need it accessible without /api prefix too
app.get("/verify-email", (req, res) => res.redirect(`/api/auth/verify-email?token=${req.query.token || ""}`));

// ── Serve built React frontend ────────────────────────────────────────────────
const FRONTEND_DIST = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
  console.log("🌐 Serving React frontend from:", FRONTEND_DIST);
} else {
  console.warn("⚠️  Frontend dist not found. Run: npm run build");
}

// ── Start ─────────────────────────────────────────────────────────────────────
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
  verifyEmailConfig(); // Check email connectivity
});
