import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { send, getBranding } from "@/lib/helpers/email";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { formatDate, formatTime, zoneAbbreviation } from "@/lib/helpers/dateFormat";
import { isEmail } from "@/lib/helpers/validation";
import { renderFollowupEmail } from "@/lib/email/templates/followUpEmail";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

// logo_url is stored root-relative (e.g. "/uploads/branding/8/logo/x.png");
// email clients can't resolve a relative src at all, so without a
// configured app URL to make it absolute, dropping it (falling through to
// the text/platform fallback) is correct — a broken <img> in an email a
// customer receives is worse than no logo.
function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return APP_URL ? `${APP_URL}${path}` : null;
}

/**
 * Everything here is resolved server-side from `companyId` — a value the
 * caller always derives from the follow-up's/lead's own row (never from a
 * request body) — so Company A can never end up rendering Company B's
 * logo, color, or contact details.
 */
async function resolveContext(companyId) {
  const [company, systemSettings] = await Promise.all([
    getBranding(companyId),
    getSettingsByGroup({ company_id: companyId }, "system"),
  ]);
  const timezone = systemSettings.timezone || "UTC";
  return {
    timezone,
    company: {
      name: company?.name || GLOBAL_VISTA_BRANDING.name,
      logoUrl: absoluteUrl(company?.logo_url),
      primaryColor: company?.primary_color || GLOBAL_VISTA_BRANDING.primaryColor,
      email: company?.contact_email || null,
      phone: company?.contact_phone || null,
      website: company?.website || null,
    },
    platform: {
      name: GLOBAL_VISTA_BRANDING.name,
      logoUrl: absoluteUrl(GLOBAL_VISTA_BRANDING.logoUrl),
    },
  };
}

function labelPair(dateValue, timezone) {
  return { dateLabel: formatDate(dateValue, timezone), timeLabel: formatTime(dateValue, timezone) };
}

async function recordEmailState(followupId, fields) {
  const columns = Object.keys(fields);
  if (!columns.length) return;
  const setSql = columns.map((c) => `${c} = ?`).join(", ");
  await pool.query(`UPDATE lead_followups SET ${setSql} WHERE id = ?`, [...Object.values(fields), followupId]);
}

async function loadLead(leadId, companyId) {
  const [[lead]] = await pool.query(`SELECT id, name, email, company_id FROM leads WHERE id = ? AND company_id = ?`, [leadId, companyId]);
  return lead || null;
}

async function dispatch({ action, followup, lead, companyId, actorId }) {
  if (!lead) return { skipped: "lead_not_found" };
  if (!lead.email || !isEmail(lead.email)) {
    await logActivity({
      userId: actorId, module: "leads", action: `followup_${action}_email_skipped`, entityType: "lead", entityId: lead.id, companyId,
      description: `Follow-up ${action} email not sent — no valid email address for ${lead.name}.`,
    });
    if (action === "created") await recordEmailState(followup.id, { confirmation_email_error: "No valid email address available for this lead." });
    if (action === "reminder") await recordEmailState(followup.id, { reminder_email_error: "No valid email address available for this lead." });
    return { skipped: "no_email" };
  }

  const ctx = await resolveContext(companyId);
  const { dateLabel, timeLabel } = labelPair(followup.scheduled_at, ctx.timezone);
  const prev = followup.previous_scheduled_at ? labelPair(followup.previous_scheduled_at, ctx.timezone) : null;

  const { subject, html } = renderFollowupEmail({
    action,
    leadName: lead.name,
    followupType: followup.type,
    followupDateLabel: dateLabel,
    followupTimeLabel: timeLabel,
    timezoneLabel: zoneAbbreviation(ctx.timezone, new Date(followup.scheduled_at)),
    previousDateLabel: prev?.dateLabel,
    previousTimeLabel: prev?.timeLabel,
    company: ctx.company,
    platform: ctx.platform,
  });

  const result = await send({ to: lead.email, subject, html, template: `followup_${action}` });

  if (action === "created") {
    await recordEmailState(followup.id, result.success ? { confirmation_sent_at: new Date() } : { confirmation_email_error: result.error || "Send failed." });
  } else if (action === "reminder") {
    await recordEmailState(followup.id, result.success ? { reminder_sent_at: new Date() } : { reminder_email_error: result.error || "Send failed." });
  } else if (action === "cancelled") {
    await recordEmailState(followup.id, result.success ? { cancellation_sent_at: new Date() } : {});
  }

  await logActivity({
    userId: actorId, module: "leads", action: `followup_${action}_email_${result.success ? "sent" : "failed"}`, entityType: "lead", entityId: lead.id, companyId,
    description: `Follow-up ${action} email ${result.success ? "sent to" : "failed to send to"} ${lead.email}${result.success ? "" : `: ${result.error || "unknown error"}`}`,
  });

  return result;
}

// Fire-and-forget from the caller's point of view — every path here is
// already wrapped so it can never throw back into the follow-up
// create/update/cancel action that's calling it. A valid follow-up must
// never get rolled back because an email failed.
async function safeDispatch(args) {
  try { return await dispatch(args); }
  catch (err) { console.error(`followupNotifications.${args.action} failed:`, err.message); return { success: false, error: err.message }; }
}

export async function sendFollowupCreatedEmail(followup, companyId, actorId) {
  const lead = await loadLead(followup.lead_id, companyId);
  return safeDispatch({ action: "created", followup, lead, companyId, actorId });
}
export async function sendFollowupRescheduledEmail(followup, companyId, actorId) {
  const lead = await loadLead(followup.lead_id, companyId);
  return safeDispatch({ action: "rescheduled", followup, lead, companyId, actorId });
}
export async function sendFollowupCancelledEmail(followup, companyId, actorId) {
  const lead = await loadLead(followup.lead_id, companyId);
  return safeDispatch({ action: "cancelled", followup, lead, companyId, actorId });
}
export async function sendFollowupReminderEmail(followup, companyId, actorId = null) {
  const lead = await loadLead(followup.lead_id, companyId);
  return safeDispatch({ action: "reminder", followup, lead, companyId, actorId });
}
