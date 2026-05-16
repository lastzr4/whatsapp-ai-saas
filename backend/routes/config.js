import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db/database.js";
import { authMiddleware } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

function getDataRoot() {
  return process.env.DATA_PATH || process.env.DATA_ROOT || path.join(__dirname, "../..");
}

// ── Find QR file (any extension) ──────────────────────────────────────────────
function getQrPath(userId) {
  const dir = path.join(getDataRoot(), `uploads/${userId}`);
  for (const ext of [".jpg",".jpeg",".png",".webp",".JPG",".PNG",".WEBP"]) {
    const p = path.join(dir, `payment-qr${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── Delete old QR files (all extensions) before saving new one ────────────────
function deleteOldQr(userId) {
  const dir = path.join(getDataRoot(), `uploads/${userId}`);
  for (const ext of [".jpg",".jpeg",".png",".webp",".JPG",".PNG",".WEBP"]) {
    const p = path.join(dir, `payment-qr${ext}`);
    if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} }
  }
}

// ── Multer storage ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(getDataRoot(), `uploads/${req.userId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    if (file.fieldname === "paymentQr") {
      // Delete old QR first (any extension)
      deleteOldQr(req.userId);
      // Save with original extension
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `payment-qr${ext}`);
    } else {
      cb(null, `knowledge-${Date.now()}.txt`);
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "paymentQr") {
      const allowed = ["image/jpeg","image/jpg","image/png","image/webp"];
      if (!allowed.includes(file.mimetype)) {
        return cb(new Error("Hanya imej PNG, JPG atau WEBP dibenarkan"));
      }
    }
    if (file.fieldname === "knowledge") {
      if (file.mimetype !== "text/plain") {
        return cb(new Error("Hanya fail .txt dibenarkan untuk knowledge"));
      }
    }
    cb(null, true);
  },
});

// ── GET config (auto-create if missing) ───────────────────────────────────────
router.get("/", authMiddleware, (req, res) => {
  let config = db.prepare("SELECT * FROM bot_configs WHERE user_id = ?").get(req.userId);
  if (!config) {
    db.prepare("INSERT INTO bot_configs (user_id, bot_name) VALUES (?, ?)").run(req.userId, "AI Assistant");
    config = db.prepare("SELECT * FROM bot_configs WHERE user_id = ?").get(req.userId);
  }
  const session = db.prepare("SELECT id FROM bot_sessions WHERE user_id = ?").get(req.userId);
  if (!session) db.prepare("INSERT INTO bot_sessions (user_id) VALUES (?)").run(req.userId);

  // Get user plan limits
  const user = db.prepare("SELECT plan, max_messages, max_logs, max_numbers FROM users WHERE id = ?").get(req.userId);

  // Count messages this month
  const msgThisMonth = db.prepare(`
    SELECT COUNT(*) as c FROM message_logs
    WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
  `).get(req.userId).c;

  res.json({
    ...config,
    has_payment_qr: !!getQrPath(req.userId),
    // Usage stats for user dashboard
    plan: user?.plan || "basic",
    max_messages: user?.max_messages || 50,
    max_logs: user?.max_logs || 5,
    max_numbers: user?.max_numbers || 1,
    msg_this_month: msgThisMonth,
    msg_remaining: Math.max(0, (user?.max_messages || 50) - msgThisMonth),
  });
});

// ── PUT config ────────────────────────────────────────────────────────────────
router.put("/", authMiddleware, (req, res) => {
  const { bot_name, knowledge, ignore_groups, allowed_numbers, payment_caption } = req.body;
  db.prepare(`
    UPDATE bot_configs SET
      bot_name = ?, knowledge = ?, ignore_groups = ?,
      allowed_numbers = ?, payment_caption = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    bot_name || "AI Assistant",
    knowledge || "",
    ignore_groups ? 1 : 0,
    allowed_numbers || "",
    payment_caption || "",
    req.userId
  );
  res.json({ success: true });
});

// ── Upload QR image ───────────────────────────────────────────────────────────
router.post("/upload-qr", authMiddleware, (req, res, next) => {
  upload.single("paymentQr")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Tiada fail diupload" });
    console.log(`✅ QR uploaded for user ${req.userId}: ${req.file.filename} (${req.file.size} bytes)`);
    res.json({ success: true, filename: req.file.filename, size: req.file.size });
  });
});

// ── Serve QR image ────────────────────────────────────────────────────────────
router.get("/payment-qr-image", authMiddleware, (req, res) => {
  const qrPath = getQrPath(req.userId);
  if (!qrPath) return res.status(404).json({ error: "QR tidak dijumpai" });
  const ext = path.extname(qrPath).toLowerCase();
  const mimeTypes = { ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".webp":"image/webp" };
  res.setHeader("Content-Type", mimeTypes[ext] || "image/jpeg");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  // sendFile requires absolute path
  const absPath = path.resolve(qrPath);
  console.log(`📤 Serving QR for user ${req.userId}: ${absPath}`);
  res.sendFile(absPath, (err) => {
    if (err) {
      console.error(`❌ QR serve error: ${err.message}`);
      res.status(500).json({ error: "Gagal serve imej" });
    }
  });
});

// ── Upload knowledge .txt ─────────────────────────────────────────────────────
router.post("/upload-knowledge", authMiddleware, (req, res, next) => {
  upload.single("knowledge")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Tiada fail diupload" });
    try {
      const content = fs.readFileSync(req.file.path, "utf-8");
      db.prepare("UPDATE bot_configs SET knowledge = ? WHERE user_id = ?").run(content, req.userId);
      fs.unlinkSync(req.file.path);
      res.json({ success: true, characters: content.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

// ── Logs ──────────────────────────────────────────────────────────────────────
router.get("/logs", authMiddleware, (req, res) => {
  const user = db.prepare("SELECT max_logs FROM users WHERE id = ?").get(req.userId);
  const limit = user?.max_logs || 5;
  const logs = db.prepare(
    "SELECT * FROM message_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
  ).all(req.userId, limit);
  res.json(logs);
});

router.delete("/logs", authMiddleware, (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: "No IDs" });
  const ph = ids.map(()=>"?").join(",");
  db.prepare(`DELETE FROM message_logs WHERE id IN (${ph}) AND user_id = ?`).run(...ids, req.userId);
  res.json({ success: true });
});

router.delete("/logs/all", authMiddleware, (req, res) => {
  const r = db.prepare("DELETE FROM message_logs WHERE user_id = ?").run(req.userId);
  res.json({ success: true, deleted: r.changes });
});

export default router;
