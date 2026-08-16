import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { parseDateTimeLocalInZone } from "@/lib/helpers/dateRange";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";
import { hasLeadMeetingsSchema } from "@/lib/db/schemaFlags";
import { MEETING_TYPES } from "@/lib/modules/crm/constants/leadStages";

function assertSchemaReady() {
  const e = new Error("Meeting scheduling isn't available yet — a pending database migration must be applied first.");
  e.status = 503;
  throw e;
}

/** Same conversion boundary leadFollowups.js uses — a datetime-local value
 * is wall-clock time in the company's configured timezone, never the
 * browser's local zone. */
async function toStoredDateTime(session, value) {
  if (!value) return null;
  const { timezone } = await getSettingsByGroup(session, "system");
  return parseDateTimeLocalInZone(value, timezone || "UTC");
}

export async function listLeadMeetings(session, leadId) {
  if (!(await hasLeadMeetingsSchema())) return [];
  const [rows] = await pool.query(
    `SELECT m.*, u.name AS created_by_name
     FROM lead_meetings m LEFT JOIN users u ON u.id = m.created_by
     WHERE m.lead_id = ? AND m.company_id = ? ORDER BY m.starts_at DESC`,
    [leadId, session.company_id]
  );
  return rows;
}

/** RLS-scoped upcoming-meeting reminders, mirroring getUpcomingFollowupReminders
 * exactly (same window/grace defaults) so both feed the same client watcher. */
export async function getUpcomingMeetingReminders(session, windowMinutes = 15, graceMinutes = 2) {
  if (!(await hasLeadMeetingsSchema())) return [];
  const { where, params } = await getVisibleLeadFilter(session);
  const [rows] = await pool.query(
    `SELECT m.id, m.title, m.starts_at, l.id AS lead_id, l.name AS lead_name
     FROM lead_meetings m JOIN leads l ON l.id = m.lead_id AND l.is_deleted = 0 AND ${where}
     WHERE m.status = 'Scheduled'
       AND m.starts_at <= DATE_ADD(NOW(), INTERVAL ? MINUTE)
       AND m.starts_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
     ORDER BY m.starts_at ASC LIMIT 50`,
    [...params, windowMinutes, graceMinutes]
  );
  return rows;
}

export async function createMeeting(session, leadId, data, createdBy) {
  if (!(await hasLeadMeetingsSchema())) assertSchemaReady();
  if (!data.title || !data.title.trim()) { const e = new Error("Meeting title is required."); e.status = 400; throw e; }
  if (!MEETING_TYPES.includes(data.meetingType)) { const e = new Error("Invalid meeting type."); e.status = 400; throw e; }
  const startsAt = await toStoredDateTime(session, data.startsAt);
  const endsAt = await toStoredDateTime(session, data.endsAt);
  if (!startsAt || !endsAt) { const e = new Error("Start and end time are required."); e.status = 400; throw e; }
  if (endsAt <= startsAt) { const e = new Error("End time must be after start time."); e.status = 400; throw e; }

  const [result] = await pool.query(
    `INSERT INTO lead_meetings (company_id, lead_id, title, meeting_type, location_or_url, participants, starts_at, ends_at, status, notes, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?)`,
    [session.company_id, leadId, data.title.trim(), data.meetingType, data.locationOrUrl || null, data.participants || null, startsAt, endsAt, data.notes || null, createdBy, createdBy]
  );

  await logActivity({
    userId: createdBy, module: "leads", action: "meeting_scheduled", entityType: "lead", entityId: leadId, companyId: session.company_id,
    description: `Scheduled meeting "${data.title.trim()}"`, meta: { meetingId: result.insertId },
  });

  const [[lead]] = await pool.query(`SELECT assigned_to, name FROM leads WHERE id = ? AND company_id = ?`, [leadId, session.company_id]);
  if (lead?.assigned_to && lead.assigned_to !== createdBy) {
    await createNotification(session.company_id, lead.assigned_to, {
      title: "Meeting scheduled", message: `"${data.title.trim()}" for ${lead.name}`, type: "meeting_scheduled", link: `/workspace/lead-management/${leadId}`,
    });
  }
  return result.insertId;
}

async function getOwnMeeting(session, id, leadId) {
  const [[existing]] = await pool.query(`SELECT * FROM lead_meetings WHERE id = ? AND lead_id = ? AND company_id = ?`, [id, leadId, session.company_id]);
  if (!existing) { const e = new Error("Meeting not found."); e.status = 404; throw e; }
  return existing;
}

export async function rescheduleMeeting(session, id, leadId, { startsAt: newStartsAt, endsAt: newEndsAt }, updatedBy) {
  if (!(await hasLeadMeetingsSchema())) assertSchemaReady();
  const existing = await getOwnMeeting(session, id, leadId);
  if (existing.status !== "Scheduled") { const e = new Error("Only a scheduled meeting can be rescheduled."); e.status = 400; throw e; }

  const startsAt = await toStoredDateTime(session, newStartsAt);
  const endsAt = await toStoredDateTime(session, newEndsAt);
  if (!startsAt || !endsAt || endsAt <= startsAt) { const e = new Error("A valid start and end time are required."); e.status = 400; throw e; }

  await pool.query(`UPDATE lead_meetings SET starts_at=?, ends_at=?, updated_by=? WHERE id=? AND company_id=?`, [startsAt, endsAt, updatedBy, id, session.company_id]);
  await logActivity({
    userId: updatedBy, module: "leads", action: "meeting_rescheduled", entityType: "lead", entityId: leadId, companyId: session.company_id,
    description: `Rescheduled meeting "${existing.title}"`, meta: { meetingId: id },
  });
}

export async function cancelMeeting(session, id, leadId, updatedBy) {
  if (!(await hasLeadMeetingsSchema())) assertSchemaReady();
  const existing = await getOwnMeeting(session, id, leadId);
  if (existing.status !== "Scheduled") { const e = new Error("Only a scheduled meeting can be cancelled."); e.status = 400; throw e; }

  await pool.query(`UPDATE lead_meetings SET status='Cancelled', updated_by=? WHERE id=? AND company_id=?`, [updatedBy, id, session.company_id]);
  await logActivity({
    userId: updatedBy, module: "leads", action: "meeting_cancelled", entityType: "lead", entityId: leadId, companyId: session.company_id,
    description: `Cancelled meeting "${existing.title}"`, meta: { meetingId: id },
  });
}

export async function completeMeeting(session, id, leadId, { outcome, notes } = {}, updatedBy) {
  if (!(await hasLeadMeetingsSchema())) assertSchemaReady();
  const existing = await getOwnMeeting(session, id, leadId);
  if (existing.status !== "Scheduled") { const e = new Error("Only a scheduled meeting can be completed."); e.status = 400; throw e; }

  await pool.query(
    `UPDATE lead_meetings SET status='Completed', outcome=?, notes=COALESCE(?, notes), updated_by=? WHERE id=? AND company_id=?`,
    [outcome || null, notes || null, updatedBy, id, session.company_id]
  );
  await logActivity({
    userId: updatedBy, module: "leads", action: "meeting_completed", entityType: "lead", entityId: leadId, companyId: session.company_id,
    description: `Completed meeting "${existing.title}"${outcome ? ` — ${outcome}` : ""}`, meta: { meetingId: id },
  });
}
