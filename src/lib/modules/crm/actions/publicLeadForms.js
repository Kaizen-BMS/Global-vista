import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createLead, assignLead, findDuplicateLead } from "@/lib/modules/crm/actions/leads";
import { sendLeadFormNotificationEmail } from "@/lib/helpers/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

/**
 * Full row, including the fields only the server-side submit handler
 * needs (default_lead_source_id, notify_emails, etc.) — this is an
 * internal lookup used by both the GET route (which must project down
 * to a public-safe subset itself, see toPublicFormPayload below) and
 * the submit/view handlers, which need everything.
 */
export async function getPublicLeadForm(slug) {
  const [[form]] = await pool.query(`SELECT * FROM lead_forms WHERE slug=? AND is_deleted=0 LIMIT 1`, [slug]);
  if (!form || form.status !== "active") return null;
  return { ...form, fields_config: JSON.parse(form.fields_config || "[]"), theme_config: JSON.parse(form.theme_config || "{}") };
}

/** Explicit allowlist for what the public GET route may return — never notify_emails, defaults, or company_id. */
export function toPublicFormPayload(form) {
  const { id, name, slug, description, fields_config, theme_config, status, recaptcha_enabled } = form;
  return { id, name, slug, description, fields_config, theme_config, status, recaptcha_enabled };
}

/** Also returns the branding of the form's own company, for a properly white-labeled public page. */
export async function getPublicFormBranding(companyId) {
  const [[company]] = await pool.query(`SELECT name, logo_url, favicon_url, primary_color, secondary_color FROM companies WHERE id=?`, [companyId]);
  return company || null;
}

export async function recordFormView(form, meta) {
  await pool.query(
    `INSERT INTO lead_form_views (form_id, company_id, source, ip_address, user_agent, device, browser, country, referrer_url)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [form.id, form.company_id, meta.source === "qr" ? "qr" : "link", meta.ip || null, meta.userAgent || null, meta.device || null, meta.browser || null, meta.country || null, meta.referrer || null]
  );
}

/**
 * Full public submission pipeline: honeypot -> field validation ->
 * duplicate detection -> lead creation (reusing createLead exactly as
 * every other lead-creation path does) -> default assignment -> tags/
 * campaign -> notifications. Every outcome (success/failed/spam) is
 * recorded in lead_form_submissions for analytics and audit, even when
 * no lead is created.
 */
export async function submitPublicLeadForm(form, rawData, meta) {
  const record = async (status, leadId, failureReason) => {
    const [result] = await pool.query(
      `INSERT INTO lead_form_submissions (
        form_id, company_id, lead_id, raw_data, ip_address, user_agent, device, browser, country, referrer_url,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content, status, failure_reason, completion_ms
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        form.id, form.company_id, leadId || null, JSON.stringify(rawData), meta.ip || null, meta.userAgent || null,
        meta.device || null, meta.browser || null, meta.country || null, meta.referrer || null,
        meta.utm?.source || null, meta.utm?.medium || null, meta.utm?.campaign || null, meta.utm?.term || null, meta.utm?.content || null,
        status, failureReason || null, meta.completionMs || null,
      ]
    );
    return result.insertId;
  };

  // Honeypot: a hidden field real visitors never see or fill. Silent
  // success response to the caller (don't tip off the bot) but no lead
  // is ever created, and it's still logged as spam for visibility.
  if (rawData.__hp) { await record("spam", null, "Honeypot field filled"); return { success: true, spam: true }; }

  const errors = [];
  if (!rawData.name || !String(rawData.name).trim()) errors.push("Name is required.");
  if (!rawData.phone || !PHONE_RE.test(rawData.phone)) errors.push("A valid phone number is required.");
  if (rawData.email && !EMAIL_RE.test(rawData.email)) errors.push("Email format looks invalid.");

  if (errors.length) { await record("failed", null, errors.join("; ")); return { success: false, errors }; }

  const pseudoSession = { company_id: form.company_id };
  const duplicate = await findDuplicateLead(form.company_id, { phone: rawData.phone, email: rawData.email });

  const leadId = await createLead(pseudoSession, {
    name: rawData.name, phone: rawData.phone, email: rawData.email || null,
    country: rawData.country || null, state: rawData.state || null, city: rawData.city || null,
    leadSourceId: form.default_lead_source_id, serviceId: form.default_service_id,
    campaign: form.campaign || meta.utm?.campaign || null,
    tags: form.default_tags || null,
    remarks: rawData.message || null,
  }, null);

  if (form.default_assigned_to) {
    await assignLead(pseudoSession, leadId, form.default_assigned_to, null).catch(() => {});
  }

  await logActivity({
    userId: null, module: "leads", action: "form_submission", entityType: "lead", entityId: leadId,
    companyId: form.company_id, description: `Lead captured via public form "${form.name}"${duplicate ? " (flagged duplicate)" : ""}`,
  });

  if (form.notify_emails) {
    const recipients = form.notify_emails.split(",").map((e) => e.trim()).filter(Boolean);
    for (const to of recipients) {
      sendLeadFormNotificationEmail({ to, formName: form.name, leadName: rawData.name, leadPhone: rawData.phone, companyId: form.company_id, leadId })
        .catch((e) => console.error("Form notification email failed:", e.message));
    }
  }

  await record("success", leadId, null);
  return { success: true, leadId };
}
