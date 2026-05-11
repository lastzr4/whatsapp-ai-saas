// Run: node create-admin.js
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "data/saas.db");

if (!fs.existsSync(dbPath)) {
  console.error("❌ Database not found. Run 'npm start' first to initialize the database.");
  process.exit(1);
}

const db = new Database(dbPath);

const email    = process.argv[2] || "admin@admin.com";
const password = process.argv[3] || "admin123";
const name     = process.argv[4] || "Super Admin";

try {
  const hashed = bcrypt.hashSync(password, 10);
  db.prepare("INSERT OR REPLACE INTO users (email, password, name, is_admin, is_active) VALUES (?, ?, ?, 1, 1)")
    .run(email, hashed, name);
  console.log("\n✅ Admin account created!");
  console.log(`   Email   : ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Name    : ${name}`);
  console.log("\n👉 Login at http://localhost:3000/login\n");
} catch (err) {
  console.error("❌ Error:", err.message);
}
