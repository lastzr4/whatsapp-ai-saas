import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { startBot, stopBot, getBotStatus, isBotRunning, getBotErrors } from "./botEngine.js";

const router = express.Router();

// Get bot status + QR code
router.get("/status", authMiddleware, (req, res) => {
  const status = getBotStatus(req.userId);
  const running = isBotRunning(req.userId);
  const errors  = getBotErrors(req.userId);
  res.json({ ...status, is_running: running, recent_errors: errors.slice(0,3) });
});

// Start bot
router.post("/start", authMiddleware, async (req, res) => {
  if (isBotRunning(req.userId)) {
    return res.json({ success: true, message: "Bot already running" });
  }
  startBot(req.userId);
  res.json({ success: true, message: "Bot starting..." });
});

// Stop bot
router.post("/stop", authMiddleware, async (req, res) => {
  await stopBot(req.userId);
  res.json({ success: true, message: "Bot stopped" });
});

// Restart bot
router.post("/restart", authMiddleware, async (req, res) => {
  await stopBot(req.userId);
  setTimeout(() => startBot(req.userId), 2000);
  res.json({ success: true, message: "Bot restarting..." });
});

export default router;
