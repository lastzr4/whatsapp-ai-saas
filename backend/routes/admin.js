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
  const { name, email, plan, is_active, max_messages, max_logs, max_numbers, notes } = req.body;
  try {
    // If plan changed, auto-apply plan limits (unless manually overridden)
    const planLimits = db.prepare("SELECT * FROM plan_limits WHERE plan = ?").get(plan || "basic");
    const finalMaxMsg     = max_messages ?? planLimits?.max_messages ?? 50;
    const finalMaxLogs    = max_logs     ?? planLimits?.max_logs     ?? 5;
    const finalMaxNumbers = max_numbers  ?? planLimits?.max_numbers  ?? 1;

    db.prepare(`
      UPDATE users SET name = ?, email = ?, plan = ?, is_active = ?,
        max_messages = ?, max_logs = ?, max_numbers = ?, notes = ?
      WHERE id = ? AND is_admin = 0
    `).run(name, email, plan || "basic", is_active ? 1 : 0,
      finalMaxMsg, finalMaxLogs, finalMaxNumbers, notes || "", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Plan Limits (admin configurable) ─────────────────────────────────────────
router.get("/plan-limits", (req, res) => {
  const limits = db.prepare("SELECT * FROM plan_limits ORDER BY id").all();
  res.json(limits);
});

router.put("/plan-limits/:plan", (req, res) => {
  const { max_messages, max_logs, max_numbers } = req.body;
  const { plan } = req.params;
  if (!["basic","starter","pro"].includes(plan))
    return res.status(400).json({ error: "Invalid plan" });

  db.prepare(`UPDATE plan_limits SET max_messages = ?, max_logs = ?, max_numbers = ?, updated_at = datetime('now') WHERE plan = ?`)
    .run(max_messages, max_logs, max_numbers, plan);

  const result = db.prepare(`UPDATE users SET max_messages = ?, max_logs = ?, max_numbers = ? WHERE plan = ? AND is_admin = 0`)
    .run(max_messages, max_logs, max_numbers, plan);

  res.json({ success: true, users_updated: result.changes });
});

// ── Sync ALL users with current plan_limits immediately ───────────────────────
router.post("/plan-limits/sync-all", (req, res) => {
  const result = db.prepare(`
    UPDATE users SET
      max_messages = (SELECT max_messages FROM plan_limits WHERE plan = users.plan),
      max_logs     = (SELECT max_logs     FROM plan_limits WHERE plan = users.plan),
      max_numbers  = (SELECT max_numbers  FROM plan_limits WHERE plan = users.plan)
    WHERE is_admin = 0
      AND EXISTS (SELECT 1 FROM plan_limits WHERE plan = users.plan)
  `).run();
  res.json({ success: true, users_updated: result.changes });
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
    const userPlan = plan || "basic";
    // Read limits from plan_limits table
    const planLimits = db.prepare("SELECT * FROM plan_limits WHERE plan = ?").get(userPlan);
    const maxMessages = planLimits?.max_messages ?? 50;
    const maxLogs     = planLimits?.max_logs     ?? 5;
    const maxNumbers  = planLimits?.max_numbers  ?? 1;

    const result = db.prepare(
      "INSERT INTO users (email, password, name, plan, is_admin, is_active, is_verified, max_messages, max_logs, max_numbers) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, ?)"
    ).run(email, hashed, name, userPlan, is_admin ? 1 : 0, maxMessages, maxLogs, maxNumbers);
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

// ── Global Knowledge Base ─────────────────────────────────────────────────────

// List all global knowledge
router.get("/global-knowledge", (req, res) => {
  const list = db.prepare(`
    SELECT gk.*, u.name as created_by_name,
      (SELECT COUNT(*) FROM tenant_knowledge_assignments WHERE knowledge_id = gk.id) as assigned_count
    FROM global_knowledge gk
    LEFT JOIN users u ON gk.created_by = u.id
    ORDER BY gk.created_at DESC
  `).all();
  res.json(list);
});

// Upload/create global knowledge
router.post("/global-knowledge", async (req, res) => {
  const { name, description, content, file_name } = req.body;
  if (!name || !content) return res.status(400).json({ error: "Nama dan kandungan diperlukan" });
  const result = db.prepare(
    "INSERT INTO global_knowledge (name, description, content, file_name, created_by) VALUES (?, ?, ?, ?, ?)"
  ).run(name, description || "", content, file_name || "", req.adminId || 1);
  res.json({ success: true, id: result.lastInsertRowid });
});

// Upload file and extract text for global knowledge
router.post("/global-knowledge/upload", async (req, res) => {
  const multer = (await import("multer")).default;
  const path = (await import("path")).default;
  const fs = (await import("fs")).default;

  const upload = multer({
    storage: multer.diskStorage({
      destination: (r, f, cb) => {
        const tmp = `/tmp/gk-${Date.now()}`;
        fs.mkdirSync(tmp, { recursive: true });
        cb(null, tmp);
      },
      filename: (r, f, cb) => cb(null, f.originalname),
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Tiada fail" });

    try {
      const { extractTextFromFile } = await import("../services/knowledgeExtractor.js");
      const text = await extractTextFromFile(req.file.path, req.file.mimetype, req.file.originalname);
      try { fs.unlinkSync(req.file.path); fs.rmdirSync(path.dirname(req.file.path)); } catch {}

      if (!text || text.trim().length < 10)
        return res.status(400).json({ error: "Fail kosong atau tidak dapat dibaca" });

      res.json({ success: true, content: text, file_name: req.file.originalname, characters: text.length });
    } catch (e) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ error: e.message });
    }
  });
});

// Update global knowledge
router.put("/global-knowledge/:id", (req, res) => {
  const { name, description, content } = req.body;
  db.prepare("UPDATE global_knowledge SET name=?, description=?, content=?, updated_at=datetime('now') WHERE id=?")
    .run(name, description || "", content, req.params.id);
  res.json({ success: true });
});

// Delete global knowledge
router.delete("/global-knowledge/:id", (req, res) => {
  db.prepare("DELETE FROM tenant_knowledge_assignments WHERE knowledge_id = ?").run(req.params.id);
  db.prepare("DELETE FROM global_knowledge WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Get assignments for a knowledge
router.get("/global-knowledge/:id/assignments", (req, res) => {
  const assigned = db.prepare(`
    SELECT u.id, u.name, u.email, u.plan
    FROM tenant_knowledge_assignments tka
    JOIN users u ON tka.user_id = u.id
    WHERE tka.knowledge_id = ?
  `).all(req.params.id);
  const all = db.prepare("SELECT id, name, email, plan FROM users WHERE is_admin = 0 AND is_active = 1 ORDER BY name").all();
  res.json({ assigned, all });
});

// Assign knowledge to tenant
router.post("/global-knowledge/:id/assign", (req, res) => {
  const { user_id } = req.body;
  try {
    db.prepare("INSERT OR IGNORE INTO tenant_knowledge_assignments (user_id, knowledge_id) VALUES (?, ?)").run(user_id, req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// Unassign knowledge from tenant
router.delete("/global-knowledge/:id/assign/:userId", (req, res) => {
  db.prepare("DELETE FROM tenant_knowledge_assignments WHERE knowledge_id = ? AND user_id = ?").run(req.params.id, req.params.userId);
  res.json({ success: true });
});

// Bulk assign/unassign
router.post("/global-knowledge/:id/bulk-assign", (req, res) => {
  const { user_ids } = req.body; // array of user_ids to assign
  const kid = req.params.id;
  // Remove all existing
  db.prepare("DELETE FROM tenant_knowledge_assignments WHERE knowledge_id = ?").run(kid);
  // Add selected
  const insert = db.prepare("INSERT OR IGNORE INTO tenant_knowledge_assignments (user_id, knowledge_id) VALUES (?, ?)");
  user_ids.forEach(uid => insert.run(uid, kid));
  res.json({ success: true, assigned: user_ids.length });
});

export default router;
