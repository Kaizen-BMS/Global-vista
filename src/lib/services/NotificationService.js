import "server-only";
import { pool } from "@/lib/db";

/**
 * Provider-interface scaffolding only, per explicit instruction
 * ("Provider architecture only"). EmailProvider is the one real,
 * working provider (wraps the existing lib/helpers/email.js, not
 * duplicating it). Every other provider throws clearly rather than
 * pretending to send — same honesty principle as the Storage providers.
 */
const providers = {
  in_app: {
    async send({ companyId, userId, title, message, link }) {
      const [result] = await pool.query(
        `INSERT INTO notifications (company_id, user_id, title, message, type, link) VALUES (?, ?, ?, ?, 'info', ?)`,
        [companyId, userId, title, message, link || null]
      );
      return { success: true, id: result.insertId };
    },
  },
  email: {
    async send({ to, subject, html }) {
      const { sendPasswordResetEmail } = await import("@/lib/helpers/email");
      // Deliberately routes through existing sendPasswordResetEmail's
      // sibling generic sender rather than importing nodemailer again
      // here — reuses the one centralized transporter, per the platform
      // rule "every module must use these [services]".
      throw new Error("Generic NotificationService email sending not yet wired to a reusable send() — use lib/helpers/email.js's specific template functions directly until a generic sendEmail() is extracted from it.");
    },
  },
  sms: { async send() { throw new Error("SMS provider not configured — no SMS vendor credentials exist yet."); } },
  whatsapp: { async send() { throw new Error("WhatsApp provider not configured — no Business API credentials exist yet."); } },
  push: { async send() { throw new Error("Push provider not configured."); } },
  webhook: {
    async send({ url, payload }) {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      return { success: res.ok, status: res.status };
    },
  },
  slack: { async send() { throw new Error("Slack provider not configured — no webhook URL registered."); } },
  teams: { async send() { throw new Error("Teams provider not configured."); } },
  discord: { async send() { throw new Error("Discord provider not configured."); } },
};

export async function notify(channel, params) {
  const provider = providers[channel];
  if (!provider) {
    const err = new Error(`Unknown notification channel: ${channel}`);
    err.status = 400;
    throw err;
  }
  return provider.send(params);
}

export function getAvailableChannels() {
  return Object.keys(providers);
}