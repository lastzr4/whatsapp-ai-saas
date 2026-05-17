import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from "qrcode";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import db from "../db/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const botInstances        = new Map(); // userId -> client
const conversationHistories = new Map();
const reconnectTimers     = new Map(); // userId -> timer
const reconnectAttempts   = new Map(); // userId -> count
const botErrorLogs        = new Map(); // userId -> [{time, error}]

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS     = 8000;

function logBotError(userId, error) {
  if (!botErrorLogs.has(userId)) botErrorLogs.set(userId, []);
  const logs = botErrorLogs.get(userId);
  logs.unshift({ time: new Date().toISOString(), error: String(error) });
  if (logs.length > 20) logs.pop(); // keep last 20 errors
  console.error(`❌ [User ${userId}] ${error}`);
}

export function getBotErrors(userId) {
  return botErrorLogs.get(userId) || [];
}

const PAYMENT_KEYWORDS = [
  "qr", "qr code", "bayar", "bayaran", "pembayaran", "transfer",
  "duitnow", "duit now", "maybank", "cimb", "rhb", "bank islam",
  "tng", "touch n go", "touchngo", "ewallet", "e-wallet",
  "nak beli", "nak bayar", "macam mana nak bayar", "cara bayar",
  "payment", "pay", "how to pay", "checkout",
];

function isPaymentQuery(text) {
  return PAYMENT_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));
}

function getConvoKey(userId, contactId) { return `${userId}:${contactId}`; }

function getHistory(userId, contactId) {
  const key = getConvoKey(userId, contactId);
  if (!conversationHistories.has(key)) conversationHistories.set(key, []);
  return conversationHistories.get(key);
}

function addToHistory(userId, contactId, role, content) {
  const history = getHistory(userId, contactId);
  history.push({ role, content });
  if (history.length > 20) history.splice(0, history.length - 20);
}

function clearHistory(userId, contactId) {
  conversationHistories.delete(getConvoKey(userId, contactId));
}

function buildSystemPrompt(config) {
  const base = `Kamu adalah ${config.bot_name}, pembantu khidmat pelanggan yang mesra.
PERATURAN:
- Jawab SAHAJA berdasarkan pangkalan pengetahuan di bawah
- Kalau soalan tak ada dalam pangkalan pengetahuan, minta pelanggan hubungi kami terus
- WAJIB balas dalam Bahasa Malaysia yang betul — BUKAN Bahasa Indonesia
- Guna perkataan Malaysia: "awak/korang", "tak", "nak", "boleh", "dengan", "sangat"
- Kalau pelanggan tulis dalam Bahasa Inggeris, balas dalam Bahasa Inggeris
- Pastikan jawapan PENDEK, mesra dan santai — ini WhatsApp chat
- Guna teks biasa sahaja, tiada formatting markdown
- Jangan reka-reka maklumat yang tidak ada dalam pangkalan pengetahuan`;

  if (config.knowledge) {
    return `${base}\n\n==================\nKNOWLEDGE BASE:\n==================\n${config.knowledge}`;
  }
  return base;
}

async function askClaude(userId, contactId, userMessage, config) {
  addToHistory(userId, contactId, "user", userMessage);
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: buildSystemPrompt(config),
    messages: getHistory(userId, contactId),
  });
  const reply = response.content[0].text;
  addToHistory(userId, contactId, "assistant", reply);
  return reply;
}

function updateSessionStatus(userId, status, phoneNumber = "", qrCode = "") {
  db.prepare(`
    UPDATE bot_sessions SET status = ?, phone_number = ?, qr_code = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(status, phoneNumber, qrCode, userId);
}

// ── Safe send — swallows "Target closed" errors silently ──────────────────────
async function safeSend(fn) {
  try {
    await fn();
  } catch (err) {
    const isTargetClosed =
      err.message?.includes("Target closed") ||
      err.message?.includes("Execution context was destroyed") ||
      err.message?.includes("Protocol error") ||
      err.message?.includes("Session closed");
    if (!isTargetClosed) throw err; // rethrow real errors
    console.warn("⚠️  safeSend: browser target closed, skipping send");
  }
}

// ── Schedule auto-reconnect ───────────────────────────────────────────────────
function scheduleReconnect(userId) {
  // Don't reconnect if user manually stopped
  const session = db.prepare("SELECT status FROM bot_sessions WHERE user_id = ?").get(userId);
  if (!session || session.status === "disconnected") return;

  const attempts = reconnectAttempts.get(userId) || 0;
  if (attempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log(`⛔ User ${userId}: max reconnect attempts reached`);
    reconnectAttempts.delete(userId);
    updateSessionStatus(userId, "disconnected");
    return;
  }

  // Clear any existing timer
  if (reconnectTimers.has(userId)) clearTimeout(reconnectTimers.get(userId));

  const delay = RECONNECT_DELAY_MS * (attempts + 1); // back-off: 8s, 16s, 24s...
  console.log(`🔄 User ${userId}: reconnecting in ${delay / 1000}s (attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
  updateSessionStatus(userId, "starting");

  const timer = setTimeout(async () => {
    reconnectTimers.delete(userId);
    reconnectAttempts.set(userId, attempts + 1);
    await startBot(userId);
  }, delay);

  reconnectTimers.set(userId, timer);
}

// ── Start bot for a user ──────────────────────────────────────────────────────
export async function startBot(userId) {
  if (botInstances.has(userId)) {
    console.log(`Bot for user ${userId} already running`);
    return;
  }

  console.log(`🚀 Starting bot for user ${userId}...`);
  updateSessionStatus(userId, "starting");

  const dataRoot = process.env.DATA_PATH || process.env.DATA_ROOT || path.join(__dirname, "../..");
  const sessionPath = path.join(dataRoot, "sessions");
  fs.mkdirSync(path.join(sessionPath, `user_${userId}`), { recursive: true });

  // ── Delete Chromium profile locks (leftover from crashed sessions) ──────────
  const profileDir = path.join(sessionPath, `user_${userId}`, `.wwebjs_auth`, `session-user_${userId}`);
  const lockFiles = ["SingletonLock", "SingletonCookie", "SingletonSocket"];
  lockFiles.forEach(lf => {
    const lockPath = path.join(profileDir, lf);
    try { if (fs.existsSync(lockPath)) { fs.unlinkSync(lockPath); console.log(`🔓 Deleted lock: ${lockPath}`); } } catch {}
  });
  // Also check root session dir
  const rootLocks = [
    path.join(sessionPath, `.wwebjs_auth`, `session-user_${userId}`, "SingletonLock"),
    path.join(sessionPath, `user_${userId}`, "SingletonLock"),
  ];
  rootLocks.forEach(lp => { try { if (fs.existsSync(lp)) fs.unlinkSync(lp); } catch {} });

  let client;
  try {
    client = new Client({
      authStrategy: new LocalAuth({
        clientId: `user_${userId}`,
        dataPath: sessionPath,
      }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--single-process",
        ],
      },
      restartOnAuthFail: false,
    });
  } catch (err) {
    logBotError(userId, `Failed to create client: ${err.message}`);
    updateSessionStatus(userId, "disconnected");
    return;
  }

  botInstances.set(userId, client);

  // ── Event: QR code ready ────────────────────────────────────────────────────
  client.on("qr", async (qr) => {
    try {
      console.log(`📱 QR generated for user ${userId}`);
      reconnectAttempts.delete(userId);
      const qrDataUrl = await qrcode.toDataURL(qr);
      updateSessionStatus(userId, "qr_pending", "", qrDataUrl);
    } catch (err) {
      logBotError(userId, `QR generation error: ${err.message}`);
    }
  });

  // ── Event: Bot ready ────────────────────────────────────────────────────────
  client.on("ready", () => {
    try {
      const phone = client.info?.wid?.user || "";
      console.log(`✅ Bot ready for user ${userId} — ${phone}`);
      reconnectAttempts.delete(userId);
      updateSessionStatus(userId, "connected", phone, "");
    } catch (err) {
      logBotError(userId, `Ready handler error: ${err.message}`);
    }
  });

  // ── Event: Auth failure ─────────────────────────────────────────────────────
  client.on("auth_failure", (msg) => {
    logBotError(userId, `Auth failed: ${msg}`);
    updateSessionStatus(userId, "auth_failed");
    botInstances.delete(userId);
    // Don't auto-reconnect — user must re-scan QR
  });

  // ── Event: Disconnected ─────────────────────────────────────────────────────
  client.on("disconnected", (reason) => {
    console.log(`🔌 Bot disconnected for user ${userId} — reason: ${reason}`);
    botInstances.delete(userId);
    if (reason === "LOGOUT") {
      updateSessionStatus(userId, "disconnected");
      reconnectAttempts.delete(userId);
    } else {
      logBotError(userId, `Disconnected unexpectedly: ${reason}`);
      scheduleReconnect(userId);
    }
  });

  // ── Event: Incoming messages ────────────────────────────────────────────────
  client.on("message", async (message) => {
    try {
      if (!message.body || message.type !== "chat") return;

      const config = db.prepare("SELECT * FROM bot_configs WHERE user_id = ?").get(userId);
      if (!config) return;

      const user = db.prepare("SELECT is_active, max_messages, plan FROM users WHERE id = ?").get(userId);
      if (!user?.is_active) { console.log(`⛔ User ${userId} suspended`); return; }

      const contact = await message.getContact();
      const chat    = await message.getChat();
      const contactId    = contact.id._serialized;
      const senderNumber = contact.number;

      if (config.ignore_groups && chat.isGroup) return;

      const allowedList = config.allowed_numbers
        ? config.allowed_numbers.split(",").map(n => n.trim()).filter(Boolean)
        : [];
      if (allowedList.length > 0 && !allowedList.includes(senderNumber)) return;

      const userText = message.body.trim();
      console.log(`📨 User ${userId} — [${senderNumber}]: ${userText}`);

      if (userText.toLowerCase() === "!reset") {
        clearHistory(userId, contactId);
        await safeSend(() => message.reply("Ingatan dah dibersihkan! 🧹"));
        return;
      }

      await safeSend(() => chat.sendStateTyping());

      // ── Check monthly limit ───────────────────────────────────────────────
      const msgThisMonth = db.prepare(`
        SELECT COUNT(*) as c FROM message_logs
        WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `).get(userId).c;
      const maxMsg = user?.max_messages || 50;
      if (msgThisMonth >= maxMsg) {
        console.log(`⚠️ User ${userId} monthly limit reached (${msgThisMonth}/${maxMsg})`);
        await safeSend(() => message.reply(
          `⚠️ Had mesej bulanan anda (${maxMsg} mesej) telah dicapai. Sila naik taraf plan anda.`
        ));
        return;
      }

      // ── Payment QR ───────────────────────────────────────────────────────
      if (isPaymentQuery(userText)) {
        const uploadsDir = path.join(dataRoot, `uploads/${userId}`);
        let qrImagePath = null;
        for (const ext of [".jpg",".jpeg",".png",".webp"]) {
          const p = path.join(uploadsDir, `payment-qr${ext}`);
          if (fs.existsSync(p)) { qrImagePath = p; break; }
        }
        if (qrImagePath) {
          await safeSend(async () => {
            const media = MessageMedia.fromFilePath(qrImagePath);
            const caption = config.payment_caption || "Ini QR code untuk pembayaran 😊";
            await chat.sendMessage(media, { caption });
            console.log(`💳 QR sent for user ${userId}`);
          });
          try { db.prepare("INSERT INTO message_logs (user_id, sender, message, reply) VALUES (?, ?, ?, ?)").run(userId, senderNumber, userText, "[QR Pembayaran dihantar]"); } catch {}
          return;
        }
      }

      // ── AI reply ─────────────────────────────────────────────────────────
      const reply = await askClaude(userId, contactId, userText, config);
      await safeSend(() => message.reply(reply));
      try { db.prepare("INSERT INTO message_logs (user_id, sender, message, reply) VALUES (?, ?, ?, ?)").run(userId, senderNumber, userText, reply); } catch {}

    } catch (err) {
      const isTargetClosed = err.message?.includes("Target closed") ||
        err.message?.includes("Execution context") || err.message?.includes("Protocol error");
      if (isTargetClosed) {
        console.warn(`⚠️ User ${userId}: browser context lost`);
      } else {
        logBotError(userId, `Message handler: ${err.message}`);
        await safeSend(() => message.reply("Maaf, ada masalah teknikal. Cuba lagi ye 🙏"));
      }
    }
  });

  // ── Initialize with error catch ─────────────────────────────────────────────
  try {
    await client.initialize();
  } catch (err) {
    const shortMsg = err.message?.includes("profile appears to be in use")
      ? "Profil Chromium terkunci. Cuba semula..."
      : err.message?.includes("Failed to launch")
      ? "Gagal lancarkan pelayar. Cuba semula..."
      : `Initialize gagal: ${err.message?.slice(0,80)}`;
    logBotError(userId, `Initialize failed: ${err.message}`);
    console.error(`❌ client.initialize() failed for user ${userId}:`, err.message);
    botInstances.delete(userId);
    updateSessionStatus(userId, "disconnected");
  }
}
// ── Stop bot ──────────────────────────────────────────────────────────────────
export async function stopBot(userId) {
  // Cancel any pending reconnect
  if (reconnectTimers.has(userId)) {
    clearTimeout(reconnectTimers.get(userId));
    reconnectTimers.delete(userId);
  }
  reconnectAttempts.delete(userId);

  const client = botInstances.get(userId);
  if (client) {
    try { await client.destroy(); } catch {}
    botInstances.delete(userId);
  }

  updateSessionStatus(userId, "disconnected");
  console.log(`🛑 Bot stopped for user ${userId}`);
}

export function getBotStatus(userId) {
  const session = db.prepare("SELECT * FROM bot_sessions WHERE user_id = ?").get(userId);
  return session || { status: "disconnected", qr_code: "", phone_number: "" };
}

export function isBotRunning(userId) {
  return botInstances.has(userId);
}

export function restoreActiveBots() {
  // Reset any sessions stuck in "starting" or "qr_pending" from previous run
  db.prepare("UPDATE bot_sessions SET status = 'disconnected', qr_code = '' WHERE status IN ('starting', 'qr_pending')").run();

  // Only restore bots that were actually connected
  const sessions = db
    .prepare("SELECT user_id FROM bot_sessions WHERE status = 'connected'")
    .all();
  sessions.forEach(({ user_id }) => {
    console.log(`🔄 Restoring bot for user ${user_id}...`);
    startBot(user_id);
  });
}
