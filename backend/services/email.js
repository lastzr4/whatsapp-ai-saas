import nodemailer from "nodemailer";

// Create transporter from env vars
function getTransporter() {
  // Support Gmail, custom SMTP, or any provider
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for others
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";
const APP_NAME = process.env.APP_NAME || "WhatsApp AI Bot";
const APP_URL  = process.env.APP_URL  || "http://localhost:3001";

export async function sendVerificationEmail(email, name, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM}>`,
    to: email,
    subject: `✅ Sahkan Email Anda — ${APP_NAME}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="background:linear-gradient(135deg,#25d366,#128c5e);width:56px;height:56px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:12px;">🤖</div>
          <h1 style="color:#0f172a;font-size:22px;margin:0;">${APP_NAME}</h1>
        </div>
        <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
          <h2 style="color:#0f172a;font-size:18px;margin-top:0;">Hai ${name}! 👋</h2>
          <p style="color:#64748b;line-height:1.6;">Terima kasih kerana mendaftar. Sila klik butang di bawah untuk mengesahkan alamat email anda.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${link}" style="background:linear-gradient(135deg,#25d366,#128c5e);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
              ✅ Sahkan Email Saya
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-bottom:0;">Link ini sah selama <strong>24 jam</strong>. Jika anda tidak mendaftar, abaikan email ini.</p>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">
          Jika butang tidak berfungsi, salin link ini:<br/>
          <a href="${link}" style="color:#25d366;word-break:break-all;">${link}</a>
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email, name, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM}>`,
    to: email,
    subject: `🔐 Reset Kata Laluan — ${APP_NAME}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="background:linear-gradient(135deg,#25d366,#128c5e);width:56px;height:56px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:12px;">🔐</div>
          <h1 style="color:#0f172a;font-size:22px;margin:0;">${APP_NAME}</h1>
        </div>
        <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
          <h2 style="color:#0f172a;font-size:18px;margin-top:0;">Reset Kata Laluan</h2>
          <p style="color:#64748b;line-height:1.6;">Hai <strong>${name}</strong>, kami terima permintaan reset kata laluan untuk akaun anda.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${link}" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
              🔐 Reset Kata Laluan
            </a>
          </div>
          <div style="background:#fef9c3;border-radius:8px;padding:12px 16px;border-left:4px solid #eab308;">
            <p style="color:#a16207;font-size:13px;margin:0;">⚠️ Link ini sah selama <strong>1 jam</strong> sahaja. Jika anda tidak membuat permintaan ini, abaikan email ini — akaun anda selamat.</p>
          </div>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">
          Jika butang tidak berfungsi, salin link ini:<br/>
          <a href="${link}" style="color:#25d366;word-break:break-all;">${link}</a>
        </p>
      </div>
    `,
  });
}

export async function verifyEmailConfig() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️  Email not configured — SMTP_USER/SMTP_PASS missing. Email features disabled.");
    return false;
  }
  try {
    const t = getTransporter();
    await t.verify();
    console.log("✅ Email service connected:", process.env.SMTP_USER);
    return true;
  } catch (err) {
    console.warn("⚠️  Email connection failed:", err.message);
    return false;
  }
}
