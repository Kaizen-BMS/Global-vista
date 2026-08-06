import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { getVisibleLeadFilter } from "@/lib/helpers/rls";

export async function listLeadFollowups(leadId) {
  const [rows] = await pool.query(
    `SELECT f.*, u.name AS created_by_name
     FROM lead_followups f
     LEFT JOIN users u ON u.id = f.created_by
     WHERE f.lead_id = ? ORDER BY f.scheduled_at DESC`,
    [leadId]
  );
  return rows;
}

export async function getTodaysFollowups(session) {
  const { where, params } = getVisibleLeadFilter(session);
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

export async function createFollowup(leadId, data, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO lead_followups (lead_id, type, status, scheduled_at, next_follow_up, notes, created_by, updated_by)
     VALUES (?, ?, 'Scheduled', ?, ?, ?, ?, ?)`,
    [leadId, data.type, data.scheduledAt, data.nextFollowUp || null, data.notes || null, createdBy, createdBy]
  );

  if (data.nextFollowUp) {
    await pool.query(`UPDATE leads SET next_follow_up = ? WHERE id = ?`, [data.nextFollowUp, leadId]);
  }

  await logActivity({ userId: createdBy, module: "leads", action: "followup_scheduled", entityType: "lead", entityId: leadId, description: `Scheduled ${data.type} follow-up` });
  return result.insertId;
}

export async function completeFollowup(id, leadId, { outcome, nextFollowUp }, updatedBy) {
  await pool.query(
    `UPDATE lead_followups SET status = 'Completed', outcome = ?, next_follow_up = ?, updated_by = ? WHERE id = ?`,
    [outcome || null, nextFollowUp || null, updatedBy, id]
  );
  if (nextFollowUp) {
    await pool.query(`UPDATE leads SET next_follow_up = ? WHERE id = ?`, [nextFollowUp, leadId]);
  }
  await logActivity({ userId: updatedBy, module: "leads", action: "followup_completed", entityType: "lead", entityId: leadId, description: `Follow-up completed: ${outcome || "no outcome noted"}` });
}