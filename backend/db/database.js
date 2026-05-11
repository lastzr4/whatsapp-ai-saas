import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getDbPath() {
  const dataRoot = process.env.DATA_ROOT || path.join(__dirname, "../..");
  const dataDir  = path.join(dataRoot, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "saas.db");
}

const db = new Database(getDbPath());
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      plan TEXT DEFAULT 'basic',
      is_active INTEGER DEFAULT 1,
      is_admin INTEGER DEFAULT 0,
      max_messages INTEGER DEFAULT 1000,
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
    { name: "users_max_messages",   sql: "ALTER TABLE users ADD COLUMN max_messages INTEGER DEFAULT 1000" },
    { name: "users_notes",          sql: "ALTER TABLE users ADD COLUMN notes TEXT DEFAULT ''" },
    { name: "users_is_verified",    sql: "ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0" },
    { name: "tokens_table", sql: `CREATE TABLE IF NOT EXISTS auth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )` },
  ];

  for (const m of migrations) {
    const done = db.prepare("SELECT id FROM _migrations WHERE name = ?").get(m.name);
    if (!done) {
      try {
        db.exec(m.sql);
        db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(m.name);
      } catch {}
    }
  }

  console.log("✅ Database initialized:", getDbPath());
}

export default db;
