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

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS     = 8000; // 8 seconds between retries

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

  const dataRoot = process.env.DATA_ROOT || path.join(__dirname, "../..");
  fs.mkdirSync(path.join(dataRoot, `sessions/user_${userId}`), { recursive: true });

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `user_${userId}`,
      dataPath: path.join(dataRoot, "sessions"),
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
      ],
    },
    // Restore session faster
    restartOnAuthFail: false,
  });

  botInstances.set(userId, client);

  client.on("qr", async (qr) => {
    console.log(`📱 QR generated for user ${userId}`);
    // New QR = fresh start, reset reconnect counter
    reconnectAttempts.delete(userId);
    const qrDataUrl = await qrcode.toDataURL(qr);
    updateSessionStatus(userId, "qr_pending", "", qrDataUrl);
  });

  client.on("ready", async () => {
    const phone = client.info?.wid?.user || "";
    console.log(`✅ Bot ready for user ${userId} — ${phone}`);
    reconnectAttempts.delete(userId); // reset counter on successful connect
    updateSessionStatus(userId, "connected", phone, "");
  });

  client.on("auth_failure", () => {
    console.log(`❌ Auth failed for user ${userId}`);
    updateSessionStatus(userId, "auth_failed");
    botInstances.delete(userId);
    // Don't auto-reconnect on auth failure — user needs to re-scan
  });

  client.on("disconnected", (reason) => {
    console.log(`🔌 Bot disconnected for user ${userId} — reason: ${reason}`);
    botInstances.delete(userId);

    // Auto-reconnect unless it was a deliberate logout
    if (reason === "LOGOUT") {
      updateSessionStatus(userId, "disconnected");
      reconnectAttempts.delete(userId);
    } else {
      scheduleReconnect(userId);
    }
  });

  // ── Handle incoming messages ────────────────────────────────────────────────
  client.on("message", async (message) => {
    try {
      if (!message.body || message.type !== "chat") return;

      const config = db.prepare("SELECT * FROM bot_configs WHERE user_id = ?").get(userId);
      if (!config) return;

      // Check if user account is still active
      const user = db.prepare("SELECT is_active FROM users WHERE id = ?").get(userId);
      if (!user?.is_active) return;

      const contact = await message.getContact();
      const chat    = await message.getChat();
      const contactId    = contact.id._serialized;
      const senderNumber = contact.number;

      if (config.ignore_groups && chat.isGroup) return;

      const allowedList = config.allowed_numbers
        ? config.allowed_numbers.split(",").map((n) => n.trim()).filter(Boolean)
        : [];
      if (allowedList.length > 0 && !allowedList.includes(senderNumber)) return;

      const userText = message.body.trim();
      console.log(`📨 User ${userId} — [${senderNumber}]: ${userText}`);

      // ── Commands ──────────────────────────────────────────────────────────
      if (userText.toLowerCase() === "!reset") {
        clearHistory(userId, contactId);
        await safeSend(() => message.reply("Ingatan dah dibersihkan! Jom mula semula 🧹"));
        return;
      }
      if (userText.toLowerCase() === "!help") {
        await safeSend(() => message.reply(
          `Hai! Saya ${config.bot_name} 😊\n\nTaip soalan awak dan saya akan cuba bantu!\n\n!reset - Padam ingatan chat`
        ));
        return;
      }

      // Show typing indicator (non-critical — ignore errors)
      await safeSend(() => chat.sendStateTyping());

      // ── Payment QR ────────────────────────────────────────────────────────
      // If it's a payment query AND we have a QR image, send it and stop.
      // Don't call Claude — avoids contradictory replies.
      if (isPaymentQuery(userText)) {
        const qrImagePath = path.join(process.env.DATA_ROOT || path.join(__dirname, "../.."), `uploads/${userId}/payment-qr.jpg`);
        if (fs.existsSync(qrImagePath)) {
          await safeSend(async () => {
            const media   = MessageMedia.fromFilePath(qrImagePath);
            const caption = config.payment_caption || "Ini QR code untuk pembayaran 😊";
            await chat.sendMessage(media, { caption });
            console.log(`💳 Payment QR sent for user ${userId}`);
          });
          // Log and stop — no Claude reply needed
          try {
            db.prepare("INSERT INTO message_logs (user_id, sender, message, reply) VALUES (?, ?, ?, ?)")
              .run(userId, senderNumber, userText, "[QR Pembayaran dihantar]");
          } catch {}
          return; // ← stop here, don't call Claude
        }
        // No QR image uploaded yet — let Claude handle it normally
      }

      // ── AI reply ──────────────────────────────────────────────────────────
      const reply = await askClaude(userId, contactId, userText, config);
      await safeSend(() => message.reply(reply));

      // Log the message
      try {
        db.prepare(
          "INSERT INTO message_logs (user_id, sender, message, reply) VALUES (?, ?, ?, ?)"
        ).run(userId, senderNumber, userText, reply);
      } catch (dbErr) {
        console.error(`DB log error for user ${userId}:`, dbErr.message);
      }

    } catch (err) {
      const isTargetClosed =
        err.message?.includes("Target closed") ||
        err.message?.includes("Execution context was destroyed") ||
        err.message?.includes("Protocol error");

      if (isTargetClosed) {
        console.warn(`⚠️  User ${userId}: browser context lost during message handling — will reconnect`);
      } else {
        console.error(`❌ Error handling message for user ${userId}:`, err.message);
        // Try to send error message — but don't crash if this also fails
        await safeSend(() => message.reply("Maaf, ada masalah teknikal. Cuba lagi ye 🙏"));
      }
    }
  });

  client.initialize();
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
  const sessions = db
    .prepare("SELECT user_id FROM bot_sessions WHERE status = 'connected'")
    .all();
  sessions.forEach(({ user_id }) => {
    console.log(`🔄 Restoring bot for user ${user_id}...`);
    startBot(user_id);
  });
}
