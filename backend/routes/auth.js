import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../db/database.js";
import { sendVerificationEmail, sendPasswordResetEmail, isEmailEnabled } from "../services/email.js";

const router = express.Router();

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createAuthToken(userId, type, hoursValid = 24) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000).toISOString();
  // Clean old tokens of same type for this user first
  db.prepare("DELETE FROM auth_tokens WHERE user_id = ? AND type = ?").run(userId, type);
  db.prepare("INSERT INTO auth_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)")
    .run(userId, token, type, expiresAt);
  return token;
}

// ── Google OAuth Config (public) ──────────────────────────────────────────────
router.get("/google-config", (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "",
  });
});

// ── Google OAuth callback (redirect flow for incognito) ───────────────────────
router.get("/google/callback", (req, res) => {
  // Serve a page that extracts id_token from URL fragment and posts to backend
  res.send(`<!DOCTYPE html>
<html>
<head><title>JomReply - Google Login</title></head>
<body>
<script>
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const idToken = params.get('id_token');
  if (idToken) {
    fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: idToken })
    })
    .then(r => r.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email, is_admin: data.is_admin }));
        window.location.href = data.is_admin ? '/admin' : '/dashboard';
      } else {
        alert(data.error || 'Login gagal');
        window.location.href = '/login';
      }
    })
    .catch(() => { window.location.href = '/login'; });
  } else {
    window.location.href = '/login';
  }
</script>
<p style="font-family:sans-serif;text-align:center;margin-top:40px;color:#555">Memproses login Google...</p>
</body>
</html>`);
});

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Google credential diperlukan" });

    // Decode JWT from Google (verify with Google's public key)
    const parts = credential.split(".");
    if (parts.length !== 3) return res.status(400).json({ error: "Token tidak sah" });

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    // Verify audience
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId)
      return res.status(400).json({ error: "Token tidak sah" });

    // Verify expiry
    if (payload.exp < Math.floor(Date.now() / 1000))
      return res.status(400).json({ error: "Token Google tamat tempoh" });

    const { email, name, email_verified, sub: googleId } = payload;
    if (!email || !email_verified)
      return res.status(400).json({ error: "Email Google tidak disahkan" });

    // Find or create user
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      // New user via Google — auto-verified, no password needed
      const planLimits = db.prepare("SELECT * FROM plan_limits WHERE plan = 'basic'").get();
      const result = db.prepare(
        "INSERT INTO users (email, password, name, is_verified, plan, max_messages, max_logs, max_numbers) VALUES (?, ?, ?, 1, 'basic', ?, ?, ?)"
      ).run(email, `google_${googleId}`, name || email.split("@")[0],
        planLimits?.max_messages ?? 50, planLimits?.max_logs ?? 5, planLimits?.max_numbers ?? 1);

      user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);

      // Create bot_configs and bot_sessions
      db.prepare("INSERT INTO bot_configs (user_id, bot_name) VALUES (?, ?)").run(user.id, "AI Assistant");
      db.prepare("INSERT INTO bot_sessions (user_id) VALUES (?)").run(user.id);
      console.log(`✅ New Google user: ${email}`);
    } else {
      // Existing user — mark as verified if not already
      if (!user.is_verified) {
        db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(user.id);
        user.is_verified = 1;
      }
    }

    if (!user.is_active)
      return res.status(403).json({ error: "Akaun anda telah digantung. Hubungi admin." });

    // Create session
    const sessionToken = generateToken();
    db.prepare("INSERT INTO login_sessions (user_id, session_token, user_agent, ip_address) VALUES (?, ?, ?, ?)")
      .run(user.id, sessionToken, req.headers["user-agent"] || "", req.ip || "");

    const token = jwt.sign({ userId: user.id, sessionToken }, process.env.JWT_SECRET, { expiresIn: "7d" });
    console.log(`✅ Google login: ${email} (admin: ${!!user.is_admin})`);
    res.json({ token, name: user.name, email: user.email, plan: user.plan, is_admin: !!user.is_admin });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(500).json({ error: "Ralat pengesahan Google" });
  }
});

// ── Register ──────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  console.log("\n📝 [REGISTER] Request received");
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: "Semua ruangan diperlukan" });
    if (password.length < 6)
      return res.status(400).json({ error: "Kata laluan minimum 6 aksara" });

    const hashed = await bcrypt.hash(password, 10);
    const isVerified = (!isEmailEnabled() || process.env.SKIP_EMAIL_VERIFY === "true") ? 1 : 0;

    // Get plan limits for basic (default plan)
    const planLimits = db.prepare("SELECT * FROM plan_limits WHERE plan = 'basic'").get();
    const maxMessages = planLimits?.max_messages ?? 50;
    const maxLogs     = planLimits?.max_logs     ?? 5;
    const maxNumbers  = planLimits?.max_numbers  ?? 1;

    const result = db.prepare(
      "INSERT INTO users (email, password, name, is_verified, plan, max_messages, max_logs, max_numbers) VALUES (?, ?, ?, ?, 'basic', ?, ?, ?)"
    ).run(email, hashed, name, isVerified, maxMessages, maxLogs, maxNumbers);

    const userId = result.lastInsertRowid;

    // Create default bot config + session
    db.prepare("INSERT INTO bot_configs (user_id, bot_name) VALUES (?, ?)").run(userId, "AI Assistant");
    db.prepare("INSERT INTO bot_sessions (user_id) VALUES (?)").run(userId);

    // Send verification email if email is configured AND skip not set
    if (isEmailEnabled() && process.env.SKIP_EMAIL_VERIFY !== "true") {
      try {
        const token = createAuthToken(userId, "verify_email", 24);
        await sendVerificationEmail(email, name, token);
        console.log(`✅ Verification email sent to ${email}`);
      } catch (emailErr) {
        console.error("Email send failed:", emailErr.message);
        // Don't fail registration if email fails
      }
      return res.json({
        success: true,
        requiresVerification: true,
        message: "Akaun berjaya dibuat! Sila semak email anda untuk mengesahkan akaun.",
      });
    }

    // No email config — log in immediately
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
    console.log(`✅ Register SUCCESS (no email verify): ${email}`);
    res.json({ token, name, email });

  } catch (err) {
    console.error("Register error:", err.message);
    if (err.message.includes("UNIQUE"))
      return res.status(400).json({ error: "Email ini sudah didaftarkan" });
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ── Verify Email ──────────────────────────────────────────────────────────────
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send(errorPage("Token tidak sah"));

  const record = db.prepare(
    "SELECT * FROM auth_tokens WHERE token = ? AND type = 'verify_email'"
  ).get(token);

  if (!record) return res.send(errorPage("Link pengesahan tidak sah atau sudah digunakan."));
  if (new Date(record.expires_at) < new Date())
    return res.send(errorPage("Link pengesahan sudah tamat tempoh. Sila daftar semula."));

  db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(record.user_id);
  db.prepare("DELETE FROM auth_tokens WHERE id = ?").run(record.id);

  console.log(`✅ Email verified for user ${record.user_id}`);
  res.send(successPage("Email Disahkan! ✅", "Akaun anda telah disahkan. Anda boleh log masuk sekarang.", "/login"));
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  console.log("\n🔑 [LOGIN] Request received:", req.body.email);
  try {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) return res.status(400).json({ error: "Email atau kata laluan tidak betul" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Email atau kata laluan tidak betul" });

    if (!user.is_active)
      return res.status(403).json({ error: "Akaun anda telah digantung. Hubungi admin." });

    // Check email verification (only if email is configured)
    if (isEmailEnabled() && !user.is_verified && process.env.SKIP_EMAIL_VERIFY !== "true") {
      return res.status(403).json({
        error: "Sila sahkan email anda dahulu. Semak inbox atau folder spam anda.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const sessionToken = generateToken(); // unique per browser/device
    db.prepare(
      "INSERT INTO login_sessions (user_id, session_token, user_agent, ip_address) VALUES (?, ?, ?, ?)"
    ).run(user.id, sessionToken, req.headers["user-agent"] || "", req.ip || "");

    const token = jwt.sign(
      { userId: user.id, sessionToken },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log(`✅ Login SUCCESS: ${email} (admin: ${!!user.is_admin})`);
    res.json({ token, name: user.name, email: user.email, plan: user.plan, is_admin: !!user.is_admin });

  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Resend Verification Email ─────────────────────────────────────────────────
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) return res.json({ success: true }); // Don't leak if email exists
    if (user.is_verified) return res.json({ success: true });

    const token = createAuthToken(user.id, "verify_email", 24);
    await sendVerificationEmail(email, user.name, token);
    res.json({ success: true });
  } catch (err) {
    console.error("Resend verification error:", err.message);
    res.status(500).json({ error: "Gagal hantar email. Cuba lagi." });
  }
});

// ── Forgot Password ───────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email diperlukan" });

    if (!isEmailEnabled()) {
      return res.status(503).json({ error: "Email tidak dikonfigurasi. Hubungi admin untuk reset kata laluan." });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    // Always return success to avoid leaking which emails are registered
    if (user) {
      const token = createAuthToken(user.id, "reset_password", 1); // 1 hour
      try {
        await sendPasswordResetEmail(email, user.name, token);
      } catch (emailErr) {
        console.error("Reset email failed:", emailErr.message);
        return res.status(500).json({ error: "Gagal hantar email. Cuba lagi." });
      }
    }

    res.json({
      success: true,
      message: "Jika email ini berdaftar, anda akan menerima link reset dalam beberapa minit.",
    });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Logout — invalidate this browser's session only ──────────────────────────
router.post("/logout", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.sessionToken) {
        db.prepare("DELETE FROM login_sessions WHERE session_token = ?").run(decoded.sessionToken);
      }
    } catch {}
  }
  res.json({ success: true });
});

// ── Reset Password (GET — show form) ─────────────────────────────────────────
router.get("/reset-password", (req, res) => {
  const { token } = req.query;
  if (!token) return res.send(errorPage("Token tidak sah"));

  const record = db.prepare(
    "SELECT * FROM auth_tokens WHERE token = ? AND type = 'reset_password'"
  ).get(token);

  if (!record || new Date(record.expires_at) < new Date()) {
    return res.send(errorPage("Link reset sudah tamat tempoh atau tidak sah. Sila minta semula."));
  }

  // Redirect to frontend reset page with token
  res.redirect(`/reset-password?token=${token}`);
});

// ── Reset Password (POST — save new password) ─────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: "Token dan kata laluan diperlukan" });
    if (password.length < 6)
      return res.status(400).json({ error: "Kata laluan minimum 6 aksara" });

    const record = db.prepare(
      "SELECT * FROM auth_tokens WHERE token = ? AND type = 'reset_password'"
    ).get(token);

    if (!record) return res.status(400).json({ error: "Token tidak sah atau sudah digunakan" });
    if (new Date(record.expires_at) < new Date())
      return res.status(400).json({ error: "Link reset sudah tamat tempoh. Sila minta semula." });

    const hashed = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, record.user_id);
    db.prepare("DELETE FROM auth_tokens WHERE id = ?").run(record.id);

    console.log(`✅ Password reset for user ${record.user_id}`);
    res.json({ success: true, message: "Kata laluan berjaya ditukar! Sila log masuk." });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Simple HTML pages for email links ────────────────────────────────────────
function successPage(title, message, link = "/login") {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#f0f4f8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#fff;border-radius:16px;padding:40px 32px;text-align:center;max-width:400px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.08)}.icon{font-size:52px;margin-bottom:16px}h1{font-size:22px;color:#0f172a;margin-bottom:10px}p{color:#64748b;font-size:15px;line-height:1.6;margin-bottom:24px}a{display:inline-block;background:linear-gradient(135deg,#25d366,#128c5e);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px}</style></head><body><div class="card"><div class="icon">✅</div><h1>${title}</h1><p>${message}</p><a href="${link}">Log Masuk →</a></div></body></html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ralat</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#f0f4f8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#fff;border-radius:16px;padding:40px 32px;text-align:center;max-width:400px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.08)}.icon{font-size:52px;margin-bottom:16px}h1{font-size:22px;color:#0f172a;margin-bottom:10px}p{color:#64748b;font-size:15px;line-height:1.6;margin-bottom:24px}a{display:inline-block;background:#f1f5f9;color:#475569;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;border:1px solid #e2e8f0}</style></head><body><div class="card"><div class="icon">❌</div><h1>Ralat</h1><p>${message}</p><a href="/login">← Kembali ke Login</a></div></body></html>`;
}

export default router;
