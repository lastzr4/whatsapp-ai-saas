import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Debug logging ─────────────────────────────────────────────────────────────
function dbLog(...args) {
  console.log(`[DB]`, ...args);
}

function getDbPath() {
  const DATA_PATH  = process.env.DATA_PATH;
  const DATA_ROOT  = process.env.DATA_ROOT;
  const fallback   = path.join(__dirname, "../..");

  dbLog(`DATA_PATH env  = "${DATA_PATH}"`);
  dbLog(`DATA_ROOT env  = "${DATA_ROOT}"`);
  dbLog(`__dirname      = "${__dirname}"`);
  dbLog(`fallback path  = "${fallback}"`);

  const dataRoot = DATA_PATH || DATA_ROOT || fallback;
  dbLog(`Using dataRoot = "${dataRoot}"`);

  const dataDir = path.join(dataRoot, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "saas.db");
  dbLog(`DB path        = "${dbPath}"`);

  // Check if file exists and its size
  if (fs.existsSync(dbPath)) {
    const size = fs.statSync(dbPath).size;
    dbLog(`DB file exists, size = ${size} bytes`);
  } else {
    dbLog(`DB file does NOT exist yet — will be created`);
  }

  return dbPath;
}

// ── Lazy DB instance ──────────────────────────────────────────────────────────
let _db = null;

function getDb() {
  if (!_db) {
    const dbPath = getDbPath();
    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    dbLog(`Database connection opened`);
  }
  return _db;
}

export function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      plan TEXT DEFAULT 'basic',
      is_active INTEGER DEFAULT 1,
      is_admin INTEGER DEFAULT 0,
      max_messages INTEGER DEFAULT 50,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bot_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      bot_name TEXT DEFAULT 'AI Assistant',
      knowledge TEXT DEFAULT '',
      payment_qr_path TEXT DEFAULT '',
      ignore_groups INTEGER DEFAULT 1,
      allowed_numbers TEXT DEFAULT '',
      payment_caption TEXT DEFAULT 'Ini QR code untuk pembayaran 😊\nScan guna mana-mana app banking atau eWallet awak.\nSelepas bayar, sila hantar resit/screenshot kepada kami ye! 🙏',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS bot_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      status TEXT DEFAULT 'disconnected',
      phone_number TEXT DEFAULT '',
      qr_code TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS message_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      reply TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, name TEXT UNIQUE);
  `);

  const migrations = [
    { name: "users_is_admin",       sql: "ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0" },
    { name: "users_max_messages",   sql: "ALTER TABLE users ADD COLUMN max_messages INTEGER DEFAULT 50" },
    { name: "users_notes",          sql: "ALTER TABLE users ADD COLUMN notes TEXT DEFAULT ''" },
    { name: "users_is_verified",    sql: "ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0" },
    { name: "users_max_logs",       sql: "ALTER TABLE users ADD COLUMN max_logs INTEGER DEFAULT 5" },
    { name: "users_max_numbers",    sql: "ALTER TABLE users ADD COLUMN max_numbers INTEGER DEFAULT 1" },
    { name: "tokens_table", sql: `CREATE TABLE IF NOT EXISTS auth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )` },
    { name: "login_sessions_table", sql: `CREATE TABLE IF NOT EXISTS login_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      user_agent TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )` },
    { name: "plan_limits_table", sql: `CREATE TABLE IF NOT EXISTS plan_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan TEXT UNIQUE NOT NULL,
      max_messages INTEGER NOT NULL DEFAULT 50,
      max_logs INTEGER NOT NULL DEFAULT 5,
      max_numbers INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    )` },
    { name: "plan_limits_seed", sql: `INSERT OR IGNORE INTO plan_limits (plan, max_messages, max_logs, max_numbers) VALUES
      ('basic',   50,   5,   1),
      ('starter', 500,  50,  3),
      ('pro',     1000, 100, 5)
    ` },
    { name: "rename_max_messages_default", sql: "UPDATE users SET max_messages = 50 WHERE max_messages = 1000 AND plan = 'basic'" },
    { name: "sync_existing_users_with_plan_limits", sql: `
      UPDATE users SET
        max_messages = (SELECT max_messages FROM plan_limits WHERE plan = users.plan),
        max_logs     = (SELECT max_logs     FROM plan_limits WHERE plan = users.plan),
        max_numbers  = (SELECT max_numbers  FROM plan_limits WHERE plan = users.plan)
      WHERE is_admin = 0
        AND EXISTS (SELECT 1 FROM plan_limits WHERE plan = users.plan)
    ` },
    { name: "sync_existing_users_v2", sql: `
      UPDATE users SET
        max_messages = (SELECT max_messages FROM plan_limits WHERE plan = users.plan),
        max_logs     = (SELECT max_logs     FROM plan_limits WHERE plan = users.plan),
        max_numbers  = (SELECT max_numbers  FROM plan_limits WHERE plan = users.plan)
      WHERE is_admin = 0
        AND EXISTS (SELECT 1 FROM plan_limits WHERE plan = users.plan)
    ` },
    { name: "global_knowledge_table", sql: `CREATE TABLE IF NOT EXISTS global_knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      file_name TEXT DEFAULT '',
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )` },
    { name: "tenant_knowledge_assignments_table", sql: `CREATE TABLE IF NOT EXISTS tenant_knowledge_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      knowledge_id INTEGER NOT NULL,
      assigned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, knowledge_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (knowledge_id) REFERENCES global_knowledge(id)
    )` },
    { name: "bot_guardrails_table", sql: `CREATE TABLE IF NOT EXISTS bot_guardrails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_enabled INTEGER DEFAULT 0,
      config_json TEXT DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
    )` },
    { name: "bot_guardrails_seed", sql: `INSERT OR IGNORE INTO bot_guardrails (key, name, description, is_enabled, config_json) VALUES
      ('rate_limit',         'Rate Limiting',           'Hadkan bilangan mesej per minit dari satu nombor', 1, '{"max_per_minute":5,"cooldown_seconds":30}'),
      ('prompt_injection',   'Anti-Prompt Injection',   'Sekat cubaan manipulate bot dengan arahan berbahaya', 1, '{"patterns":["ignore previous","abaikan arahan","act as","kamu adalah","you are now","forget your","jangan ikut"]}'),
      ('profanity_filter',   'Profanity Filter',        'Sekat mesej yang mengandungi kata kesat', 0, '{"words":[],"action":"ignore"}'),
      ('business_hours',     'Waktu Operasi',           'Bot hanya aktif dalam waktu yang ditetapkan', 0, '{"start":"09:00","end":"18:00","days":[1,2,3,4,5],"timezone":"Asia/Kuala_Lumpur","away_message":"Terima kasih! Kami beroperasi 9am-6pm. Mesej anda akan kami balas semula dalam waktu operasi 😊"}'),
      ('message_length',     'Had Panjang Mesej',       'Hadkan panjang mesej yang diterima', 1, '{"max_chars":1000,"action":"truncate"}'),
      ('conversation_limit', 'Had Perbualan Harian',    'Hadkan bilangan mesej per hari dari satu nombor', 0, '{"max_per_day":30,"reset_hour":0,"away_message":"Terima kasih kerana menghubungi kami! Had perbualan harian telah dicapai. Sila hubungi semula esok 😊"}'),
      ('repeat_detection',   'Kesan Mesej Berulang',    'Abaikan mesej yang sama dihantar berulang kali', 1, '{"max_repeat":3,"window_minutes":5}'),
      ('number_blacklist',   'Senarai Hitam Nombor',    'Sekat nombor telefon tertentu dari menggunakan bot', 0, '{"numbers":[]}')
    ` },
  ];

  for (const m of migrations) {
    const done = db.prepare("SELECT id FROM _migrations WHERE name = ?").get(m.name);
    if (!done) {
      try {
        db.exec(m.sql);
        db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(m.name);
        dbLog(`Migration applied: ${m.name}`);
      } catch {}
    }
  }

  // Log user count to confirm data persistence
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  dbLog(`Users in database: ${userCount}`);

  // Sync all existing users with current plan_limits on every start
  try {
    const syncResult = db.prepare(`
      UPDATE users SET
        max_messages = (SELECT max_messages FROM plan_limits WHERE plan = users.plan),
        max_logs     = (SELECT max_logs     FROM plan_limits WHERE plan = users.plan),
        max_numbers  = (SELECT max_numbers  FROM plan_limits WHERE plan = users.plan)
      WHERE is_admin = 0
        AND EXISTS (SELECT 1 FROM plan_limits WHERE plan = users.plan)
    `).run();
    if (syncResult.changes > 0) dbLog(`Synced ${syncResult.changes} users with plan limits`);
  } catch (e) { dbLog(`Plan sync skipped: ${e.message}`); }

  console.log(`✅ Database initialized: ${getDbPath()}`);
}

// ── Proxy export ──────────────────────────────────────────────────────────────
const dbProxy = new Proxy({}, {
  get(_, prop) {
    return getDb()[prop];
  }
});

export default dbProxy;
