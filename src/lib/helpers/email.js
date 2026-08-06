import "server-only";
import nodemailer from "nodemailer";
import { pool } from "@/lib/db";

let cachedTransporter = null;
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
  return cachedTransporter;
}
async function logEmail({ recipient, userId = null, subject, template, status, smtpResponse, messageId = null, createdBy = null }) {
  try {
    await pool.query(`INSERT INTO email_logs (recipient, user_id, subject, template, status, smtp_response, message_id, sent_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [recipient, userId, subject, template, status, smtpResponse || null, messageId, status === "sent" ? new Date() : null, createdBy]);
  } catch (err) { console.error("Email log failed:", err.message); }
}
async function send({ to, userId = null, subject, html, template, createdBy = null }) {
  try {
    const info = await getTransporter().sendMail({ from: `"Global Vista" <${process.env.EMAIL_USER}>`, to, subject, html });
    await logEmail({ recipient: to, userId, subject, template, status: "sent", smtpResponse: info.response, messageId: info.messageId, createdBy });
    return { success: true };
  } catch (err) {
    await logEmail({ recipient: to, userId, subject, template, status: "failed", smtpResponse: err.message, createdBy });
    return { success: false };
  }
}
function wrap({ title, body }) {
  return `<div style="font-family:sans-serif;background:#f4f4f5;padding:32px 0;"><div style="max-width:520px;margin:0 auto;background:#0a0a0a;border-radius:16px;overflow:hidden;">
  <div style="padding:24px 32px;background:#111827;"><p style="color:#fff;font-weight:600;margin:0;">Global Vista</p></div>
  <div style="padding:32px;color:#e5e5e5;"><h2 style="color:#fff;">${title}</h2>${body}</div></div></div>`;
}
export async function sendWelcomeEmail({ to, userId, name, email, tempPassword, roleName, createdBy }) {
  const loginUrl = `${(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/login`;
  const html = wrap({ title: `Welcome, ${name}`, body: `<p>Email: ${email}<br/>Temp password: ${tempPassword}<br/>Role: ${roleName}</p><a href="${loginUrl}">Log In</a>` });
  return send({ to, userId, subject: "Welcome", html, template: "welcome", createdBy });
}
export async function sendPasswordResetEmail({ to, userId, name, resetUrl }) {
  const html = wrap({ title: "Reset your password", body: `<p>Hi ${name || "there"},</p><a href="${resetUrl}">Reset Password</a><p>Expires in 30 minutes.</p>` });
  return send({ to, userId, subject: "Reset your password", html, template: "password_reset" });
}