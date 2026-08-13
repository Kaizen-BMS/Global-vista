import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";
import { createNotification } from "@/lib/actions/notifications";
import { sendFollowupCreatedEmail, sendFollowupRescheduledEmail, sendFollowupCancelledEmail } from "@/lib/modules/crm/actions/followupNotifications";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { parseDateTimeLocalInZone } from "@/lib/helpers/dateRange";

/** Every follow-up write goes through this — the single point where an
 * HTML datetime-local value (no timezone of its own) gets interpreted as
 * wall-clock time in the company's configured zone before it ever reaches
 * a DATETIME column. Falls back to UTC if the setting is unset, same
 * default the rest of the app uses. Returns a real Date (or null) — pass
 * it straight through as a query parameter, never re-stringify it. */
async function toStoredDateTime(session, value) {
  if (!value) return null;
  const { timezone } = await getSettingsByGroup(session, "system");
  return parseDateTimeLocalInZone(value, timezone || "UTC");
}

export async function listLeadFollowups(session, leadId) {
  const [rows] = await pool.query(
    `SELECT f.*, u.name AS created_by_name
     FROM lead_followups f
     LEFT JOIN users u ON u.id = f.created_by
     WHERE f.lead_id = ? AND f.company_id = ? ORDER BY f.scheduled_at DESC`,
    [leadId, session.company_id]
  );
  return rows;
}

export async function getTodaysFollowups(session) {
  const { where, params } = await getVisibleLeadFilter(session);
  const [rows] = await pool.query(
    `SELECT f.*, l.name AS lead_name, l.phone AS lead_phone
     FROM lead_followups f
     JOIN leads l ON l.id = f.lead_id AND l.is_deleted = 0
     WHERE ${where} AND DATE(f.scheduled_at) = CURDATE() AND f.status = 'Scheduled'
     ORDER BY f.scheduled_at ASC`,
    params
  );
  return rows;
}

export async function getFollowupDashboard(session) {
  const { where, params } = await getVisibleLeadFilter(session);
  const base = `SELECT f.id, f.type, f.status, f.scheduled_at, l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone, l.priority, l.company_id, u.name AS assigned_name
     FROM lead_followups f JOIN leads l ON l.id = f.lead_id AND l.is_deleted=0 AND ${where}
     LEFT JOIN users u ON u.id = l.assigned_to`;

  // Oldest-pending-first within each bucket, so nothing waits forever unnoticed.
  const [overdue] = await pool.query(`${base} WHERE f.status='Scheduled' AND f.scheduled_at < NOW() ORDER BY f.scheduled_at ASC LIMIT 100`, params);
  const [today] = await pool.query(`${base} WHERE f.status='Scheduled' AND DATE(f.scheduled_at) = CURDATE() ORDER BY f.scheduled_at ASC LIMIT 100`, params);
  const [tomorrow] = await pool.query(`${base} WHERE f.status='Scheduled' AND DATE(f.scheduled_at) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) ORDER BY f.scheduled_at ASC LIMIT 100`, params);
  const [thisWeek] = await pool.query(
    `${base} WHERE f.status='Scheduled' AND DATE(f.scheduled_at) > DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE(f.scheduled_at) <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) ORDER BY f.scheduled_at ASC LIMIT 100`,
    params
  );
  const [upcoming] = await pool.query(`${base} WHERE f.status='Scheduled' AND DATE(f.scheduled_at) > DATE_ADD(CURDATE(), INTERVAL 7 DAY) ORDER BY f.scheduled_at ASC LIMIT 100`, params);
  const [highPriority] = await pool.query(`${base} WHERE f.status='Scheduled' AND l.priority IN ('High','Urgent') ORDER BY f.scheduled_at ASC LIMIT 100`, params);
  const [completedToday] = await pool.query(`${base} WHERE f.status='Completed' AND DATE(f.scheduled_at) = CURDATE() ORDER BY f.scheduled_at DESC LIMIT 100`, params);

  return { overdue, today, tomorrow, thisWeek, upcoming, highPriority, completedToday };
}

export async function createFollowup(session, leadId, data, createdBy) {
  const scheduledAt = await toStoredDateTime(session, data.scheduledAt);
  const nextFollowUp = await toStoredDateTime(session, data.nextFollowUp);
  const [result] = await pool.query(
    `INSERT INTO lead_followups (company_id, lead_id, type, status, scheduled_at, next_follow_up, notes, created_by, updated_by)
     VALUES (?, ?, ?, 'Scheduled', ?, ?, ?, ?, ?)`,
    [session.company_id, leadId, data.type, scheduledAt, nextFollowUp, data.notes || null, createdBy, createdBy]
  );

  if (nextFollowUp) {
    await pool.query(`UPDATE leads SET next_follow_up = ? WHERE id = ? AND company_id = ?`, [nextFollowUp, leadId, session.company_id]);
  }

  await logActivity({ userId: createdBy, module: "leads", action: "followup_scheduled", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Scheduled ${data.type} follow-up` });

  const [[lead]] = await pool.query(`SELECT assigned_to, name FROM leads WHERE id = ? AND company_id = ?`, [leadId, session.company_id]);
  if (lead?.assigned_to && lead.assigned_to !== createdBy) {
    await createNotification(session.company_id, lead.assigned_to, {
      title: "Follow-up scheduled",
      message: `${data.type} for ${lead.name}`,
      type: "followup_created",
      link: `/workspace/lead-management/${leadId}`,
    });
  }

  // Fire-and-forget from this action's perspective — sendFollowupCreatedEmail
  // never throws (see followupNotifications.js), so a slow or failed email
  // provider can never fail the follow-up creation itself.
  sendFollowupCreatedEmail({ id: result.insertId, lead_id: leadId, type: data.type, scheduled_at: scheduledAt }, session.company_id, createdBy);

  return result.insertId;
}

/** Reschedule an existing Scheduled follow-up to a new date/time — sends a
 * "rescheduled" email (never re-sends the original confirmation). */
export async function rescheduleFollowup(session, id, leadId, newScheduledAt, updatedBy) {
  const [[existing]] = await pool.query(
    `SELECT id, lead_id, type, status, scheduled_at FROM lead_followups WHERE id = ? AND lead_id = ? AND company_id = ?`,
    [id, leadId, session.company_id]
  );
  if (!existing) { const e = new Error("Follow-up not found."); e.status = 404; throw e; }
  if (existing.status !== "Scheduled") { const e = new Error("Only a scheduled follow-up can be rescheduled."); e.status = 400; throw e; }

  const scheduledAt = await toStoredDateTime(session, newScheduledAt);
  await pool.query(`UPDATE lead_followups SET scheduled_at = ?, updated_by = ? WHERE id = ? AND company_id = ?`, [scheduledAt, updatedBy, id, session.company_id]);
  await logActivity({
    userId: updatedBy, module: "leads", action: "followup_rescheduled", entityType: "lead", entityId: leadId, companyId: session.company_id,
    description: `Rescheduled ${existing.type} follow-up`,
  });

  sendFollowupRescheduledEmail(
    { id, lead_id: leadId, type: existing.type, scheduled_at: scheduledAt, previous_scheduled_at: existing.scheduled_at },
    session.company_id, updatedBy
  );
}

/** Cancel a Scheduled follow-up — 'Cancelled' is an existing lead_followups.status
 * value, not a new state invented for this feature. */
export async function cancelFollowup(session, id, leadId, updatedBy) {
  const [[existing]] = await pool.query(
    `SELECT id, lead_id, type, status, scheduled_at FROM lead_followups WHERE id = ? AND lead_id = ? AND company_id = ?`,
    [id, leadId, session.company_id]
  );
  if (!existing) { const e = new Error("Follow-up not found."); e.status = 404; throw e; }
  if (existing.status !== "Scheduled") { const e = new Error("Only a scheduled follow-up can be cancelled."); e.status = 400; throw e; }

  await pool.query(`UPDATE lead_followups SET status = 'Cancelled', updated_by = ? WHERE id = ? AND company_id = ?`, [updatedBy, id, session.company_id]);
  await logActivity({
    userId: updatedBy, module: "leads", action: "followup_cancelled", entityType: "lead", entityId: leadId, companyId: session.company_id,
    description: `Cancelled ${existing.type} follow-up`,
  });

  sendFollowupCancelledEmail({ id, lead_id: leadId, type: existing.type, scheduled_at: existing.scheduled_at }, session.company_id, updatedBy);
}

/**
 * Records an interaction that already happened (Call/WhatsApp/Email/etc.)
 * as a completed follow-up, and optionally schedules the next one in the
 * same action — the "quick log" flow from the lead detail quick-action
 * bar, so counsellors never have to open two separate forms for
 * "what I just did" and "what's next."
 */
export async function logQuickActivity(session, leadId, { type, note, nextFollowUp: nextFollowUpInput, durationSeconds, disposition }, actorId) {
  const nextFollowUp = await toStoredDateTime(session, nextFollowUpInput);
  const conn = await pool.getConnection();
  let completedId;
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO lead_followups (company_id, lead_id, type, status, scheduled_at, outcome, notes, duration_seconds, disposition, created_by, updated_by)
       VALUES (?, ?, ?, 'Completed', NOW(), ?, ?, ?, ?, ?, ?)`,
      [session.company_id, leadId, type, note || null, note || null, durationSeconds || null, disposition || null, actorId, actorId]
    );
    completedId = result.insertId;
    if (nextFollowUp) {
      await conn.query(
        `INSERT INTO lead_followups (company_id, lead_id, type, status, scheduled_at, created_by, updated_by) VALUES (?, ?, ?, 'Scheduled', ?, ?, ?)`,
        [session.company_id, leadId, type, nextFollowUp, actorId, actorId]
      );
      await conn.query(`UPDATE leads SET next_follow_up = ? WHERE id = ? AND company_id = ?`, [nextFollowUp, leadId, session.company_id]);
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }

  const dispositionNote = disposition ? ` — ${disposition}` : "";
  const durationNote = durationSeconds ? ` (${Math.round(durationSeconds / 60)} min)` : "";
  await logActivity({ userId: actorId, module: "leads", action: "followup_completed", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `${type}: ${note || "logged"}${dispositionNote}${durationNote}${nextFollowUp ? " — next follow-up scheduled" : ""}` });

  const [[lead]] = await pool.query(`SELECT assigned_to, name FROM leads WHERE id = ? AND company_id = ?`, [leadId, session.company_id]);
  if (lead?.assigned_to && lead.assigned_to !== actorId && nextFollowUp) {
    await createNotification(session.company_id, lead.assigned_to, {
      title: "Next follow-up scheduled",
      message: `${type} for ${lead.name}`,
      type: "followup_created",
      link: `/workspace/lead-management/${leadId}`,
    });
  }

  return completedId;
}

export async function completeFollowup(session, id, leadId, { outcome, nextFollowUp: nextFollowUpInput, durationSeconds, disposition }, updatedBy) {
  const nextFollowUp = await toStoredDateTime(session, nextFollowUpInput);
  await pool.query(
    `UPDATE lead_followups SET status = 'Completed', outcome = ?, next_follow_up = ?, duration_seconds = ?, disposition = ?, updated_by = ? WHERE id = ? AND company_id = ?`,
    [outcome || null, nextFollowUp, durationSeconds || null, disposition || null, updatedBy, id, session.company_id]
  );
  if (nextFollowUp) {
    await pool.query(`UPDATE leads SET next_follow_up = ? WHERE id = ? AND company_id = ?`, [nextFollowUp, leadId, session.company_id]);
  }
  const dispositionNote = disposition ? ` — ${disposition}` : "";
  await logActivity({ userId: updatedBy, module: "leads", action: "followup_completed", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Follow-up completed: ${outcome || "no outcome noted"}${dispositionNote}` });
}