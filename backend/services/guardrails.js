/**
 * Guardrails Rule Engine
 * Global rules configured by admin — applied to all tenant bots
 */

// In-memory state for rate limiting, repeat detection, conversation limits
const rateLimitMap   = new Map(); // "userId:number" -> [timestamps]
const repeatMap      = new Map(); // "userId:number" -> [messages]
const dailyCountMap  = new Map(); // "userId:number:date" -> count

let _db = null;
export function initGuardrails(db) { _db = db; }

function getRule(key) {
  if (!_db) return null;
  try {
    const row = _db.prepare("SELECT * FROM bot_guardrails WHERE key = ?").get(key);
    if (!row || !row.is_enabled) return null;
    return { ...row, config: JSON.parse(row.config_json || "{}") };
  } catch { return null; }
}

/**
 * Main check function — run all active rules
 * Returns: { blocked: false } or { blocked: true, reason: "...", action: "ignore|reply", reply: "..." }
 */
export function checkGuardrails(userId, senderNumber, messageText) {
  const context = { userId, senderNumber, messageText };

  // 1. Number Blacklist
  const blacklistResult = checkBlacklist(context);
  if (blacklistResult.blocked) return blacklistResult;

  // 2. Business Hours
  const hoursResult = checkBusinessHours(context);
  if (hoursResult.blocked) return hoursResult;

  // 3. Rate Limiting
  const rateResult = checkRateLimit(context);
  if (rateResult.blocked) return rateResult;

  // 4. Daily Conversation Limit
  const dailyResult = checkDailyLimit(context);
  if (dailyResult.blocked) return dailyResult;

  // 5. Message Length
  const lengthResult = checkMessageLength(context);
  if (lengthResult.blocked) return lengthResult;

  // 6. Repeat Detection
  const repeatResult = checkRepeat(context);
  if (repeatResult.blocked) return repeatResult;

  // 7. Profanity Filter
  const profanityResult = checkProfanity(context);
  if (profanityResult.blocked) return profanityResult;

  // 8. Prompt Injection
  const injectionResult = checkPromptInjection(context);
  if (injectionResult.blocked) return injectionResult;

  return { blocked: false };
}

// ── Rule Implementations ──────────────────────────────────────────────────────

function checkBlacklist({ userId, senderNumber }) {
  const rule = getRule("number_blacklist");
  if (!rule) return { blocked: false };
  const numbers = rule.config.numbers || [];
  if (numbers.includes(senderNumber)) {
    console.log(`🚫 [Guardrail] Blacklisted number: ${senderNumber}`);
    return { blocked: true, reason: "blacklist", action: "ignore" };
  }
  return { blocked: false };
}

function checkBusinessHours({ userId }) {
  const rule = getRule("business_hours");
  if (!rule) return { blocked: false };

  const { start, end, days, away_message } = rule.config;
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const currentTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  const isWorkDay = (days || [1,2,3,4,5]).includes(dayOfWeek);
  const isWorkHour = currentTime >= (start || "09:00") && currentTime <= (end || "18:00");

  if (!isWorkDay || !isWorkHour) {
    console.log(`🚫 [Guardrail] Outside business hours: ${currentTime} day=${dayOfWeek}`);
    return {
      blocked: true, reason: "business_hours", action: "reply",
      reply: away_message || "Terima kasih! Kami sedang tidak beroperasi sekarang. Sila hubungi semula dalam waktu operasi kami 😊"
    };
  }
  return { blocked: false };
}

function checkRateLimit({ userId, senderNumber }) {
  const rule = getRule("rate_limit");
  if (!rule) return { blocked: false };

  const { max_per_minute = 5 } = rule.config;
  const key = `${userId}:${senderNumber}`;
  const now = Date.now();
  const window = 60 * 1000; // 1 minute

  if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
  const timestamps = rateLimitMap.get(key).filter(t => now - t < window);
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);

  if (timestamps.length > max_per_minute) {
    console.log(`🚫 [Guardrail] Rate limit: ${senderNumber} sent ${timestamps.length}/${max_per_minute} msgs/min`);
    return { blocked: true, reason: "rate_limit", action: "ignore" };
  }
  return { blocked: false };
}

function checkDailyLimit({ userId, senderNumber }) {
  const rule = getRule("conversation_limit");
  if (!rule) return { blocked: false };

  const { max_per_day = 30, away_message } = rule.config;
  const today = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${senderNumber}:${today}`;

  const count = (dailyCountMap.get(key) || 0) + 1;
  dailyCountMap.set(key, count);

  if (count > max_per_day) {
    console.log(`🚫 [Guardrail] Daily limit: ${senderNumber} sent ${count}/${max_per_day} today`);
    return {
      blocked: true, reason: "daily_limit", action: "reply",
      reply: away_message || "Had perbualan harian telah dicapai. Sila hubungi semula esok 😊"
    };
  }
  return { blocked: false };
}

function checkMessageLength({ messageText }) {
  const rule = getRule("message_length");
  if (!rule) return { blocked: false };

  const { max_chars = 1000 } = rule.config;
  if (messageText.length > max_chars) {
    console.log(`🚫 [Guardrail] Message too long: ${messageText.length}/${max_chars} chars`);
    return {
      blocked: true, reason: "message_length", action: "reply",
      reply: `Maaf, mesej terlalu panjang (${messageText.length} aksara). Sila ringkaskan kepada ${max_chars} aksara atau kurang 🙏`
    };
  }
  return { blocked: false };
}

function checkRepeat({ userId, senderNumber, messageText }) {
  const rule = getRule("repeat_detection");
  if (!rule) return { blocked: false };

  const { max_repeat = 3, window_minutes = 5 } = rule.config;
  const key = `${userId}:${senderNumber}`;
  const now = Date.now();
  const window = window_minutes * 60 * 1000;

  if (!repeatMap.has(key)) repeatMap.set(key, []);
  const recent = repeatMap.get(key).filter(m => now - m.time < window);
  recent.push({ text: messageText.toLowerCase().trim(), time: now });
  repeatMap.set(key, recent);

  const sameCount = recent.filter(m => m.text === messageText.toLowerCase().trim()).length;
  if (sameCount > max_repeat) {
    console.log(`🚫 [Guardrail] Repeat message: "${messageText.slice(0,30)}" x${sameCount}`);
    return { blocked: true, reason: "repeat", action: "ignore" };
  }
  return { blocked: false };
}

function checkProfanity({ messageText }) {
  const rule = getRule("profanity_filter");
  if (!rule) return { blocked: false };

  const words = rule.config.words || [];
  if (!words.length) return { blocked: false };

  const lower = messageText.toLowerCase();
  const found = words.find(w => lower.includes(w.toLowerCase()));
  if (found) {
    console.log(`🚫 [Guardrail] Profanity detected`);
    const action = rule.config.action || "ignore";
    return {
      blocked: true, reason: "profanity", action,
      reply: action === "reply" ? "Maaf, saya tidak dapat memproses mesej tersebut 🙏" : undefined
    };
  }
  return { blocked: false };
}

function checkPromptInjection({ messageText }) {
  const rule = getRule("prompt_injection");
  if (!rule) return { blocked: false };

  const patterns = rule.config.patterns || [
    "ignore previous", "abaikan arahan", "act as", "kamu adalah",
    "you are now", "forget your", "jangan ikut", "pretend you",
    "roleplay as", "system prompt", "jailbreak"
  ];

  const lower = messageText.toLowerCase();
  const found = patterns.find(p => lower.includes(p.toLowerCase()));
  if (found) {
    console.log(`🚫 [Guardrail] Prompt injection attempt: "${found}"`);
    return {
      blocked: true, reason: "prompt_injection", action: "reply",
      reply: "Maaf, saya tidak dapat memproses mesej tersebut 🙏"
    };
  }
  return { blocked: false };
}

// Cleanup old in-memory data every hour
setInterval(() => {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  for (const [k, v] of rateLimitMap) {
    if (Array.isArray(v) && v.every(t => now - t > hour)) rateLimitMap.delete(k);
  }
  for (const [k, v] of repeatMap) {
    if (Array.isArray(v) && v.every(m => now - m.time > hour)) repeatMap.delete(k);
  }
}, 60 * 60 * 1000);
