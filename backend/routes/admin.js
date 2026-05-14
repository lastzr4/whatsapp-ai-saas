import express from "express";
import bcrypt from "bcryptjs";
import db from "../db/database.js";
import { adminMiddleware } from "../middleware/admin.js";
import { stopBot, isBotRunning } from "./botEngine.js";

const router = express.Router();

// ── All routes require admin ────────────────────────────────────────────────
router.use(adminMiddleware);

// ── Dashboard Stats ─────────────────────────────────────────────────────────
router.get("/stats", (req, res) => {
  const totalUsers    = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_admin = 0").get().c;
  const activeUsers   = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_active = 1 AND is_admin = 0").get().c;
  const connectedBots = db.prepare("SELECT COUNT(*) as c FROM bot_sessions WHERE status = 'connected'").get().c;
  const totalMessages = db.prepare("SELECT COUNT(*) as c FROM message_logs").get().c;
  const todayMessages = db.prepare("SELECT COUNT(*) as c FROM message_logs WHERE date(created_at) = date('now')").get().c;
  const newThisWeek   = db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-7 days') AND is_admin = 0").get().c;

  // Messages per day last 7 days
  const msgChart = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM message_logs
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY day ORDER BY day ASC
  `).all();

  // Plan breakdown
  const plans = db.prepare(`
    SELECT plan, COUNT(*) as count FROM users WHERE is_admin = 0 GROUP BY plan
  `).all();

  res.json({ totalUsers, activeUsers, connectedBots, totalMessages, todayMessages, newThisWeek, msgChart, plans });
});

// ── List All Tenants ─────────────────────────────────────────────────────────
router.get("/tenants", (req, res) => {
  const tenants = db.prepare(`
    SELECT
      u.id, u.email, u.name, u.plan, u.is_active, u.max_messages, u.notes, u.created_at,
      s.status as bot_status, s.phone_number,
      bc.bot_name,
      (SELECT COUNT(*) FROM message_logs ml WHERE ml.user_id = u.id) as total_messages,
      (SELECT COUNT(*) FROM message_logs ml WHERE ml.user_id = u.id AND date(ml.created_at) = date('now')) as today_messages
    FROM users u
    LEFT JOIN bot_sessions s ON s.user_id = u.id
    LEFT JOIN bot_configs bc ON bc.user_id = u.id
    WHERE u.is_admin = 0
    ORDER BY u.created_at DESC
  `).all();

  // Mark which are currently running
  const result = tenants.map(t => ({
    ...t,
    is_running: isBotRunning(t.id)
  }));

  res.json(result);
});

// ── Get Single Tenant ────────────────────────────────────────────────────────
router.get("/tenants/:id", (req, res) => {
  const user = db.prepare(`
    SELECT u.*, s.status as bot_status, s.phone_number, bc.bot_name, bc.knowledge, bc.ignore_groups, bc.allowed_numbers
    FROM users u
    LEFT JOIN bot_sessions s ON s.user_id = u.id
    LEFT JOIN bot_configs bc ON bc.user_id = u.id
    WHERE u.id = ? AND u.is_admin = 0
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: "Tenant not found" });

  const logs = db.prepare(`
    SELECT * FROM message_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.params.id);

  res.json({ ...user, logs, is_running: isBotRunning(parseInt(req.params.id)) });
});

// ── Update Tenant ────────────────────────────────────────────────────────────
router.put("/tenants/:id", (req, res) => {
  const { name, email, plan, is_active, max_messages, notes } = req.body;
  try {
    db.prepare(`
      UPDATE users SET name = ?, email = ?, plan = ?, is_active = ?, max_messages = ?, notes = ?
      WHERE id = ? AND is_admin = 0
    `).run(name, email, plan || "basic", is_active ? 1 : 0, max_messages || 1000, notes || "", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Reset Tenant Password ────────────────────────────────────────────────────
router.post("/tenants/:id/reset-password", async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ error: "Password min 6 characters" });
  const hashed = await bcrypt.hash(password, 10);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, req.params.id);
  res.json({ success: true });
});

// ── Suspend / Activate Tenant ────────────────────────────────────────────────
router.post("/tenants/:id/suspend", async (req, res) => {
  db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(req.params.id);
  // Force stop their bot
  await stopBot(parseInt(req.params.id));
  res.json({ success: true });
});

router.post("/tenants/:id/activate", (req, res) => {
  db.prepare("UPDATE users SET is_active = 1 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ── Force Stop Tenant Bot ─────────────────────────────────────────────────────
router.post("/tenants/:id/stop-bot", async (req, res) => {
  await stopBot(parseInt(req.params.id));
  res.json({ success: true });
});

// ── Delete Tenant ─────────────────────────────────────────────────────────────
router.delete("/tenants/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await stopBot(id);
  db.prepare("DELETE FROM message_logs WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM bot_configs WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM bot_sessions WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ? AND is_admin = 0").run(id);
  res.json({ success: true });
});

// ── Get Tenant Message Logs ───────────────────────────────────────────────────
router.get("/tenants/:id/logs", (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM message_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
  `).all(req.params.id);
  res.json(logs);
});

// ── Global Message Logs ───────────────────────────────────────────────────────
router.get("/logs", (req, res) => {
  const logs = db.prepare(`
    SELECT ml.*, u.name as user_name, u.email
    FROM message_logs ml
    JOIN users u ON u.id = ml.user_id
    ORDER BY ml.created_at DESC LIMIT 100
  `).all();
  res.json(logs);
});

// ── Create Admin Account ──────────────────────────────────────────────────────
router.post("/create-admin", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: "All fields required" });
  try {
    const hashed = await bcrypt.hash(password, 10);
    db.prepare("INSERT INTO users (email, password, name, is_admin, is_verified) VALUES (?, ?, ?, 1, 1)")
      .run(email, hashed, name);
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes("UNIQUE"))
      return res.status(400).json({ error: "Email already exists" });
    res.status(500).json({ error: err.message });
  }
});

// ── DB Viewer ─────────────────────────────────────────────────────────────────
router.get("/db/users", (req, res) => {
  const users = db.prepare(
    "SELECT id, email, name, password, plan, is_active, is_admin, is_verified, max_messages, created_at FROM users ORDER BY id DESC"
  ).all();
  res.json(users);
});

router.get("/db/sessions", (req, res) => {
  const sessions = db.prepare(
    "SELECT s.*, u.email FROM bot_sessions s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.id DESC"
  ).all();
  res.json(sessions);
});

// ── Login sessions (browser sessions) ────────────────────────────────────────
router.get("/db/login-sessions", (req, res) => {
  const sessions = db.prepare(`
    SELECT ls.*, u.email, u.name FROM login_sessions ls
    LEFT JOIN users u ON u.id = ls.user_id
    ORDER BY ls.last_active DESC
  `).all();
  res.json(sessions);
});

// Delete a login session (force logout that browser)
router.delete("/db/login-sessions/:id", (req, res) => {
  db.prepare("DELETE FROM login_sessions WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Delete all login sessions for a user (force logout all browsers)
router.delete("/db/login-sessions/user/:userId", (req, res) => {
  const result = db.prepare("DELETE FROM login_sessions WHERE user_id = ?").run(req.params.userId);
  res.json({ success: true, deleted: result.changes });
});

// ── Fix — verify all unverified users ────────────────────────────────────────
router.post("/db/verify-all-users", (req, res) => {
  const result = db.prepare("UPDATE users SET is_verified = 1 WHERE is_verified = 0").run();
  res.json({ success: true, updated: result.changes });
});

// ── Fix — verify single user ──────────────────────────────────────────────────
router.post("/db/verify-user/:id", (req, res) => {
  db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ── Add user directly ─────────────────────────────────────────────────────────
router.post("/db/add-user", async (req, res) => {
  const { name, email, password, plan, is_admin } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Nama, email dan kata laluan diperlukan" });
  if (password.length < 6)
    return res.status(400).json({ error: "Kata laluan minimum 6 aksara" });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = db.prepare(
      "INSERT INTO users (email, password, name, plan, is_admin, is_active, is_verified) VALUES (?, ?, ?, ?, ?, 1, 1)"
    ).run(email, hashed, name, plan || "basic", is_admin ? 1 : 0);
    const userId = result.lastInsertRowid;
    db.prepare("INSERT INTO bot_configs (user_id, bot_name) VALUES (?, ?)").run(userId, "AI Assistant");
    db.prepare("INSERT INTO bot_sessions (user_id) VALUES (?)").run(userId);
    res.json({ success: true, id: userId });
  } catch (err) {
    if (err.message.includes("UNIQUE"))
      return res.status(400).json({ error: "Email ini sudah didaftarkan" });
    res.status(500).json({ error: err.message });
  }
});

export default router;
