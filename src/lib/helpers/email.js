import "server-only";
import nodemailer from "nodemailer";
import { pool } from "@/lib/db";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";

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
export async function send({ to, userId = null, subject, html, template, createdBy = null }) {
  try {
    const info = await getTransporter().sendMail({ from: `"${GLOBAL_VISTA_BRANDING.name}" <${process.env.EMAIL_USER}>`, to, subject, html });
    await logEmail({ recipient: to, userId, subject, template, status: "sent", smtpResponse: info.response, messageId: info.messageId, createdBy });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    await logEmail({ recipient: to, userId, subject, template, status: "failed", smtpResponse: err.message, createdBy });
    return { success: false, error: err.message };
  }
}
// Never trust a caller-supplied companyId that didn't come from the
// authenticated session/record chain — this only ever reads the ONE row
// for the id it's given, so the tenant-isolation guarantee lives entirely
// in what the caller passes in (see followupNotifications.js, which
// resolves companyId from the follow-up's own row, never from a request body).
export async function getBranding(companyId) {
  if (!companyId) return null;
  try {
    const [[company]] = await pool.query(`SELECT name, logo_url, primary_color, contact_email, contact_phone, website FROM companies WHERE id=?`, [companyId]);
    return company || null;
  } catch { return null; }
}

function wrap({ title, bodyFn, branding }) {
  const brandName = branding?.name || GLOBAL_VISTA_BRANDING.name;
  const brandColor = branding?.primary_color || "#4f46e5";
  const logo = branding?.logo_url
    ? `<img src="${branding.logo_url}" alt="" style="height:28px;object-fit:contain;" />`
    : `<p style="color:#fff;font-weight:600;margin:0;">${brandName}</p>`;
  return `<div style="font-family:sans-serif;background:#f4f4f5;padding:32px 0;"><div style="max-width:520px;margin:0 auto;background:#0a0a0a;border-radius:16px;overflow:hidden;">
  <div style="padding:24px 32px;background:#111827;">${logo}</div>
  <div style="padding:32px;color:#e5e5e5;"><h2 style="color:#fff;">${title}</h2>${bodyFn(brandColor)}</div>
  <div style="padding:16px 32px;border-top:1px solid #262626;color:#737373;font-size:11px;">${brandName}</div></div></div>`;
}
export async function sendWelcomeEmail({ to, userId, name, email, tempPassword, roleName, createdBy, companyId }) {
  const loginUrl = `${(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/login`;
  const branding = await getBranding(companyId);
  // tempPassword is null for self-service registrations (the registrant set
  // their own password and already knows it) — the temp-password line only
  // makes sense for operator-provisioned accounts, where a real one exists.
  const passwordLine = tempPassword ? `Temp password: ${tempPassword}<br/>` : "";
  const html = wrap({
    title: `Welcome, ${name}`,
    bodyFn: (color) => `<p>Email: ${email}<br/>${passwordLine}Role: ${roleName}</p><a href="${loginUrl}" style="color:${color};">Log In</a>`,
    branding,
  });
  return send({ to, userId, subject: "Welcome", html, template: "welcome", createdBy });
}
export async function sendPasswordResetEmail({ to, userId, name, resetUrl, companyId }) {
  const branding = await getBranding(companyId);
  const html = wrap({
    title: "Reset your password",
    bodyFn: (color) => `<p>Hi ${name || "there"},</p><a href="${resetUrl}" style="color:${color};">Reset Password</a><p>Expires in 30 minutes.</p>`,
    branding,
  });
  return send({ to, userId, subject: "Reset your password", html, template: "password_reset" });
}
export async function sendLeadFormNotificationEmail({ to, formName, leadName, leadPhone, companyId, leadId }) {
  const branding = await getBranding(companyId);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const html = wrap({
    title: "New lead from your form",
    bodyFn: (color) => `<p><strong style="color:#fff;">${leadName}</strong> just submitted "${formName}".<br/>Phone: ${leadPhone}</p><a href="${appUrl}/workspace/lead-management/${leadId}" style="color:${color};">View Lead</a>`,
    branding,
  });
  return send({ to, subject: `New lead: ${leadName}`, html, template: "lead_form_notification" });
}