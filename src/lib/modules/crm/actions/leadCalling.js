import "server-only";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { getSettingsByGroup, updateSettings } from "@/lib/actions/settings";
import { hasLeadCallsSchema } from "@/lib/db/schemaFlags";
import { placeExotelBridgeCall, fetchExotelCallDetails, ExotelNotConfiguredError } from "@/lib/telephony/exotelClient";

function assertSchemaReady() {
  const e = new Error("The call recording schema hasn't been applied to this database yet."); e.status = 503; throw e;
}

/** Reads the company's Calling Integration settings and reports whether
 * enough is filled in to actually place a call — used both to gate the
 * "Call" button in the UI and to fail fast (clear error, not a raw Exotel
 * 401) before ever hitting Exotel. Since every call is billed by Exotel to
 * the company's own account, `calling_enabled` is a separate, explicit
 * pause switch — a company can keep its credentials saved but turn calling
 * off to stop new charges, without having to delete and re-enter them
 * later. Missing/never-touched (`calling_enabled` absent) defaults to
 * enabled, matching the toggle's own on-by-default UI — nothing can
 * actually place a call yet at that point anyway, since the credential
 * fields are also empty for a company that's never touched this section. */
export async function getCallingSettings(session) {
  const values = await getSettingsByGroup(session, "calling");
  const enabled = values.calling_enabled !== "false";
  const hasCredentials = values.calling_provider === "exotel"
    && !!values.exotel_sid && !!values.exotel_api_key && !!values.exotel_api_token && !!values.exotel_exophone;
  return { ...values, enabled, hasCredentials, configured: enabled && hasCredentials };
}

/** Generates (once) and returns the per-company shared secret embedded in
 * the StatusCallback URL Exotel is told to hit — our webhook has no
 * session and Exotel doesn't sign its callbacks, so this token is the
 * only thing standing between "any POST claiming to be Exotel" and "an
 * actual update to this company's call log". Stored alongside the rest of
 * the calling settings so it survives exactly like any other credential. */
async function ensureWebhookToken(session, values) {
  if (values.exotel_webhook_token) return values.exotel_webhook_token;
  const token = crypto.randomBytes(24).toString("hex");
  await updateSettings(session, "calling", { exotel_webhook_token: token }, session.id);
  return token;
}

/** The webhook route has no session — this is the only lookup that lets
 * it figure out WHICH company an inbound Exotel callback belongs to,
 * purely from the shared secret embedded in that company's own
 * StatusCallback URL (see ensureWebhookToken above). */
export async function findCompanyIdByWebhookToken(token) {
  if (!token) return null;
  const [[row]] = await pool.query(
    `SELECT company_id FROM crm_settings WHERE \`group\` = 'calling' AND \`key\` = 'exotel_webhook_token' AND \`value\` = ? LIMIT 1`,
    [token]
  );
  return row?.company_id || null;
}

export async function listLeadCalls(session, leadId) {
  if (!(await hasLeadCallsSchema())) return [];
  const [rows] = await pool.query(
    `SELECT c.*, u.name AS employee_name
     FROM lead_calls c
     LEFT JOIN users u ON u.id = c.employee_id
     WHERE c.lead_id = ? AND c.company_id = ?
     ORDER BY c.created_at DESC`,
    [leadId, session.company_id]
  );
  return rows;
}

/**
 * Places the actual call: Exotel rings the EMPLOYEE's own registered
 * mobile first, and once they pick up, bridges to the lead's number —
 * both legs recorded on Exotel's side. A lead_calls row is written before
 * the Exotel request so a failed request still leaves a "failed" record
 * behind (never a silent no-op the owner can't see).
 */
export async function startLeadCall(session, leadId) {
  if (!(await hasLeadCallsSchema())) assertSchemaReady();

  const [[lead]] = await pool.query(`SELECT id, phone, name FROM leads WHERE id = ? AND company_id = ?`, [leadId, session.company_id]);
  if (!lead) { const e = new Error("Lead not found."); e.status = 404; throw e; }
  if (!lead.phone) { const e = new Error("This lead has no phone number on file."); e.status = 400; throw e; }

  const [[employee]] = await pool.query(`SELECT id, phone, name FROM users WHERE id = ? AND company_id = ?`, [session.id, session.company_id]);
  if (!employee?.phone) {
    const e = new Error("Your account has no phone number on file — ask your admin to add one under your profile before making calls."); e.status = 400; throw e;
  }

  const settings = await getCallingSettings(session);
  if (!settings.hasCredentials) throw new ExotelNotConfiguredError("Calling isn't set up yet — ask your company owner to connect it under Organizational Setting → Calling Integration.");
  if (!settings.enabled) throw new ExotelNotConfiguredError("Calling has been turned off by your company owner.");

  const webhookToken = await ensureWebhookToken(session, settings);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (!appUrl) { const e = new Error("Server misconfiguration: NEXT_PUBLIC_APP_URL isn't set, so Exotel has nowhere to send the call result."); e.status = 500; throw e; }
  const statusCallbackUrl = `${appUrl}/api/webhooks/exotel?token=${encodeURIComponent(webhookToken)}`;

  const [result] = await pool.query(
    `INSERT INTO lead_calls (company_id, lead_id, employee_id, provider, from_number, to_number, status, created_by)
     VALUES (?,?,?,'exotel',?,?,'initiated',?)`,
    [session.company_id, leadId, session.id, employee.phone, lead.phone, session.id]
  );
  const callRowId = result.insertId;

  try {
    const { callSid, status } = await placeExotelBridgeCall({
      sid: settings.exotel_sid, apiKey: settings.exotel_api_key, apiToken: settings.exotel_api_token, apiBase: settings.exotel_api_base,
      from: employee.phone, to: lead.phone, callerId: settings.exotel_exophone, statusCallbackUrl,
    });
    await pool.query(`UPDATE lead_calls SET provider_call_sid = ?, status = ?, started_at = NOW() WHERE id = ?`, [callSid, status, callRowId]);
  } catch (err) {
    await pool.query(`UPDATE lead_calls SET status = 'failed' WHERE id = ?`, [callRowId]);
    throw err;
  }

  await logActivity({
    userId: session.id, module: "leads", action: "call_start", entityType: "lead", entityId: leadId, companyId: session.company_id,
    description: `Called ${lead.name} (${lead.phone})`, meta: { callId: callRowId },
  }).catch(() => {});

  return { id: callRowId };
}

/** Normalizes Exotel's terminal call-status strings (which vary a bit
 * across their docs/versions — "completed", "done", "no-answer",
 * "busy", "failed", "canceled") down to this table's own enum. Anything
 * unrecognized falls back to 'in-progress' rather than throwing, since a
 * webhook that 500s gets retried forever by the sender. */
function normalizeStatus(raw) {
  const s = (raw || "").toLowerCase();
  if (["completed", "done"].includes(s)) return "completed";
  if (["no-answer", "noanswer"].includes(s)) return "no-answer";
  if (["busy"].includes(s)) return "busy";
  if (["failed"].includes(s)) return "failed";
  if (["canceled", "cancelled"].includes(s)) return "canceled";
  if (["ringing"].includes(s)) return "ringing";
  if (["in-progress", "in_progress", "answered"].includes(s)) return "in-progress";
  return "in-progress";
}

/** Called by the /api/webhooks/exotel route once `token` has already been
 * matched to a company. `payload` is whatever Exotel's StatusCallback (or
 * our own fallback poll) posted — read defensively since the exact field
 * names aren't 100% pinned down (see exotelClient.js's header comment). */
export async function handleExotelCallEvent(companyId, payload) {
  const callSid = payload.CallSid || payload.Sid || payload.call_sid;
  if (!callSid) return { matched: false };

  const [[row]] = await pool.query(`SELECT * FROM lead_calls WHERE provider_call_sid = ? AND company_id = ?`, [callSid, companyId]);
  if (!row) return { matched: false };

  const status = normalizeStatus(payload.Status || payload.DialCallStatus || payload.CallStatus);
  const durationRaw = payload.DialCallDuration ?? payload.Duration ?? payload.CallDuration;
  const duration = durationRaw != null ? Number(durationRaw) : null;
  let recordingUrl = payload.RecordingUrl || payload.RecordingURL || payload.recording_url || null;

  // Recordings sometimes aren't ready the instant the final status lands —
  // one best-effort follow-up fetch, never blocking the webhook response
  // on it failing.
  if (!recordingUrl && status === "completed") {
    try {
      const settings = await getCallingSettings({ company_id: companyId });
      const details = await fetchExotelCallDetails({
        sid: settings.exotel_sid, apiKey: settings.exotel_api_key, apiToken: settings.exotel_api_token, apiBase: settings.exotel_api_base, callSid,
      });
      recordingUrl = details?.RecordingUrl || details?.RecordingURL || null;
    } catch { /* best-effort only */ }
  }

  await pool.query(
    `UPDATE lead_calls SET status=?, duration_seconds=?, recording_url=COALESCE(?, recording_url), ended_at=IF(? IN ('completed','failed','no-answer','busy','canceled'), NOW(), ended_at) WHERE id=?`,
    [status, duration, recordingUrl, status, row.id]
  );
  return { matched: true, leadCallId: row.id };
}
