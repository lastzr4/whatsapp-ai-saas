import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/database.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  console.log("\n📝 [REGISTER] Request received");
  console.log("   Body:", JSON.stringify({ ...req.body, password: "***" }));

  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      console.log("   ❌ Missing fields — email:", !!email, "password:", !!password, "name:", !!name);
      return res.status(400).json({ error: "All fields required" });
    }

    console.log("   🔐 Hashing password...");
    const hashed = await bcrypt.hash(password, 10);

    console.log("   💾 Inserting user into DB...");
    const result = db
      .prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)")
      .run(email, hashed, name);
    console.log("   ✅ User inserted, ID:", result.lastInsertRowid);

    console.log("   💾 Creating bot_config...");
    db.prepare("INSERT INTO bot_configs (user_id, bot_name) VALUES (?, ?)").run(
      result.lastInsertRowid,
      "AI Assistant"
    );

    console.log("   💾 Creating bot_session...");
    db.prepare("INSERT INTO bot_sessions (user_id) VALUES (?)").run(
      result.lastInsertRowid
    );

    console.log("   🔑 JWT_SECRET exists:", !!process.env.JWT_SECRET);
    const token = jwt.sign(
      { userId: result.lastInsertRowid },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("   ✅ Register SUCCESS for:", email);
    res.json({ token, name, email });
  } catch (err) {
    console.error("   ❌ Register ERROR:", err.message);
    console.error("   Stack:", err.stack);
    if (err.message.includes("UNIQUE"))
      return res.status(400).json({ error: "Email already registered" });
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  console.log("\n🔑 [LOGIN] Request received");
  console.log("   Email:", req.body.email);

  try {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      console.log("   ❌ User not found:", email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    console.log("   🔍 User found, checking password...");
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log("   ❌ Wrong password for:", email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log("   ✅ Login SUCCESS for:", email);
    res.json({ token, name: user.name, email: user.email, plan: user.plan });
  } catch (err) {
    console.error("   ❌ Login ERROR:", err.message);
    console.error("   Stack:", err.stack);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

export default router;
