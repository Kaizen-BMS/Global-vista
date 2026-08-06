import "server-only";
import nodemailer from "nodemailer";
import { pool } from "@/lib/db";

let cachedTransporter = null;
let verifiedOnce = false;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return cachedTransporter;
}

async function verifyTransporter() {
  if (verifiedOnce) return true;
  try {
    await getTransporter().verify();
    verifiedOnce = true;
    return true;
  } catch (err) {
    console.error("SMTP transporter verification failed:", err.message);
    return false;
  }
}

async function logEmail({ recipient, userId = null, subject, template, status, smtpResponse, messageId = null, retryCount = 0, failureReason = null, createdBy = null }) {
  try {
    await pool.query(
      `INSERT INTO email_logs
        (recipient, user_id, subject, template, status, smtp_response, message_id, sent_at, retry_count, failure_reason, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recipient, userId, subject, template, status, smtpResponse || null, messageId,
        status === "sent" ? new Date() : null, retryCount, failureReason, createdBy,
      ]
    );
  } catch (err) {
    console.error("Failed to write email log:", err.message);
  }
}

async function sendWithLogging({ to, userId = null, subject, html, template, createdBy = null }) {
  await verifyTransporter();

  const attempt = async () => getTransporter().sendMail({
    from: `"Global Vista Educators" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  try {
    const info = await attempt();
    await logEmail({ recipient: to, userId, subject, template, status: "sent", smtpResponse: info.response, messageId: info.messageId, retryCount: 0, createdBy });
    return { success: true };
  } catch (firstErr) {
    try {
      const info = await attempt();
      await logEmail({ recipient: to, userId, subject, template, status: "sent", smtpResponse: info.response, messageId: info.messageId, retryCount: 1, createdBy });
      return { success: true };
    } catch (secondErr) {
      await logEmail({ recipient: to, userId, subject, template, status: "failed", smtpResponse: secondErr.message, retryCount: 1, failureReason: secondErr.message, createdBy });
      console.error(`Email delivery failed (${template}) to ${to}:`, secondErr.message);
      return { success: false, error: secondErr.message };
    }
  }
}

function wrapTemplate({ title, bodyHtml }) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f4f4f5; padding:32px 0;">
    <div style="max-width:520px; margin:0 auto; background:#0a0a0a; border-radius:16px; overflow:hidden;">
      <div style="padding:24px 32px; background:#111827; border-bottom:1px solid #262626;">
        <p style="color:#fff; font-size:18px; font-weight:600; margin:0;">Global Vista Educators</p>
        <p style="color:#818cf8; font-size:12px; margin:4px 0 0;">CRM Platform</p>
      </div>
      <div style="padding:32px; color:#e5e5e5;">
        <h2 style="color:#fff; font-size:18px; margin:0 0 16px;">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="padding:20px 32px; border-top:1px solid #262626; color:#737373; font-size:12px;">
        This is an automated message from the Global Vista Educators CRM. If you didn't expect this email, please contact support.
      </div>
    </div>
  </div>`;
}

export async function sendWelcomeEmail({ to, userId = null, name, email, tempPassword, roleName, createdBy = null }) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/crm/login`;
  const html = wrapTemplate({
    title: `Welcome, ${name}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Your CRM account has been created. Here are your login details:</p>
      <div style="background:#171717; border:1px solid #262626; border-radius:8px; padding:16px; margin-bottom:16px;">
        <p style="margin:0 0 8px;"><strong style="color:#fff;">Email:</strong> ${email}</p>
        <p style="margin:0 0 8px;"><strong style="color:#fff;">Temporary Password:</strong> ${tempPassword}</p>
        <p style="margin:0;"><strong style="color:#fff;">Role:</strong> ${roleName}</p>
      </div>
      <a href="${loginUrl}" style="display:inline-block; background:#4f46e5; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-size:14px;">Log In to CRM</a>
      <p style="margin:16px 0 0; font-size:13px; color:#a3a3a3;">You'll be asked to change this password on first login.</p>
    `,
  });

  return sendWithLogging({ to, userId, subject: "Welcome to the Global Vista Educators CRM", html, template: "welcome_email", createdBy });
}

export async function sendPasswordResetEmail({ to, userId = null, name, resetUrl }) {
  const html = wrapTemplate({
    title: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi ${name || "there"}, we received a request to reset your CRM password.</p>
      <a href="${resetUrl}" style="display:inline-block; background:#4f46e5; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-size:14px;">Reset Password</a>
      <p style="margin:16px 0 0; font-size:13px; color:#a3a3a3;">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  return sendWithLogging({ to, userId, subject: "Reset your CRM password", html, template: "password_reset" });
}