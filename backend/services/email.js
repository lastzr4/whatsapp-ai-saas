import nodemailer from "nodemailer";

const APP_NAME = process.env.APP_NAME || "WhatsApp AI Bot";
const APP_URL  = process.env.APP_URL  || "http://localhost:3001";
const FROM     = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";

// ── Resend API (recommended for Railway — no SMTP port issues) ────────────────
async function sendViaResend(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || `${APP_NAME} <onboarding@resend.dev>`,
      to,
      subject,
      html,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Resend API error");
}

// ── SMTP fallback ─────────────────────────────────────────────────────────────
async function sendViaSMTP(to, subject, html) {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
  await transporter.sendMail({ from: `"${APP_NAME}" <${FROM}>`, to, subject, html });
}

// ── Auto-pick provider ────────────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
  if (process.env.RESEND_API_KEY) return sendViaResend(to, subject, html);
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return sendViaSMTP(to, subject, html);
  throw new Error("No email provider configured. Set RESEND_API_KEY or SMTP_USER/SMTP_PASS.");
}

export function isEmailEnabled() {
  return !!(process.env.RESEND_API_KEY || (process.env.SMTP_USER && process.env.SMTP_PASS));
}

// ── Templates ─────────────────────────────────────────────────────────────────
export async function sendVerificationEmail(email, name, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail(email, `✅ Sahkan Email Anda — ${APP_NAME}`, `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="background:linear-gradient(135deg,#25d366,#128c5e);width:56px;height:56px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:12px;">🤖</div>
        <h1 style="color:#0f172a;font-size:22px;margin:0;">${APP_NAME}</h1>
      </div>
      <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
        <h2 style="color:#0f172a;font-size:18px;margin-top:0;">Hai ${name}! 👋</h2>
        <p style="color:#64748b;line-height:1.6;">Terima kasih kerana mendaftar. Sila klik butang di bawah untuk mengesahkan alamat email anda.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${link}" style="background:linear-gradient(135deg,#25d366,#128c5e);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">✅ Sahkan Email Saya</a>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin:0;">Link sah selama <strong>24 jam</strong>. Jika anda tidak mendaftar, abaikan email ini.</p>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">Link: <a href="${link}" style="color:#25d366;word-break:break-all;">${link}</a></p>
    </div>
  `);
}

export async function sendPasswordResetEmail(email, name, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail(email, `🔐 Reset Kata Laluan — ${APP_NAME}`, `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="background:linear-gradient(135deg,#25d366,#128c5e);width:56px;height:56px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:12px;">🔐</div>
        <h1 style="color:#0f172a;font-size:22px;margin:0;">${APP_NAME}</h1>
      </div>
      <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
        <h2 style="color:#0f172a;font-size:18px;margin-top:0;">Reset Kata Laluan</h2>
        <p style="color:#64748b;line-height:1.6;">Hai <strong>${name}</strong>, kami terima permintaan reset kata laluan.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${link}" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">🔐 Reset Kata Laluan</a>
        </div>
        <div style="background:#fef9c3;border-radius:8px;padding:12px 16px;border-left:4px solid #eab308;">
          <p style="color:#a16207;font-size:13px;margin:0;">⚠️ Link sah selama <strong>1 jam</strong> sahaja.</p>
        </div>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">Link: <a href="${link}" style="color:#25d366;word-break:break-all;">${link}</a></p>
    </div>
  `);
}

export async function verifyEmailConfig() {
  if (!isEmailEnabled()) {
    console.warn("⚠️  Email not configured — users will be auto-verified. Set RESEND_API_KEY to enable email.");
    return false;
  }
  if (process.env.RESEND_API_KEY) {
    console.log("✅ Email provider: Resend API");
    return true;
  }
  try {
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await t.verify();
    console.log("✅ Email provider: SMTP —", process.env.SMTP_USER);
    return true;
  } catch (err) {
    console.warn("⚠️  SMTP failed:", err.message);
    return false;
  }
}
