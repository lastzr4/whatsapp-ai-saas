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
  return process.env.DATA_ROOT || path.join(__dirname, "../..");
}

// Multer — save uploads to persistent volume
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(getDataRoot(), `uploads/${req.userId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const name = file.fieldname === "paymentQr" ? "payment-qr.jpg" : file.originalname;
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Get config
router.get("/", authMiddleware, (req, res) => {
  const config = db.prepare("SELECT * FROM bot_configs WHERE user_id = ?").get(req.userId);
  if (!config) return res.status(404).json({ error: "Config not found" });
  const qrPath = path.join(getDataRoot(), `uploads/${req.userId}/payment-qr.jpg`);
  res.json({ ...config, has_payment_qr: fs.existsSync(qrPath) });
});

// Update config
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

// Upload payment QR image
router.post("/upload-qr", authMiddleware, upload.single("paymentQr"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ success: true });
});

// Upload knowledge.txt
router.post("/upload-knowledge", authMiddleware, upload.single("knowledge"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const content = fs.readFileSync(req.file.path, "utf-8");
  db.prepare("UPDATE bot_configs SET knowledge = ? WHERE user_id = ?").run(content, req.userId);
  fs.unlinkSync(req.file.path);
  res.json({ success: true, characters: content.length });
});

// Get message logs
router.get("/logs", authMiddleware, (req, res) => {
  const logs = db.prepare(
    "SELECT * FROM message_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
  ).all(req.userId);
  res.json(logs);
});

// Delete selected logs
router.delete("/logs", authMiddleware, (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: "No IDs provided" });
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`DELETE FROM message_logs WHERE id IN (${placeholders}) AND user_id = ?`)
    .run(...ids, req.userId);
  res.json({ success: true, deleted: ids.length });
});

// Delete all logs
router.delete("/logs/all", authMiddleware, (req, res) => {
  const result = db.prepare("DELETE FROM message_logs WHERE user_id = ?").run(req.userId);
  res.json({ success: true, deleted: result.changes });
});

// Serve payment QR image
router.get("/payment-qr-image", authMiddleware, (req, res) => {
  const qrPath = path.join(getDataRoot(), `uploads/${req.userId}/payment-qr.jpg`);
  if (!fs.existsSync(qrPath)) return res.status(404).json({ error: "Not found" });
  res.sendFile(qrPath);
});

export default router;
