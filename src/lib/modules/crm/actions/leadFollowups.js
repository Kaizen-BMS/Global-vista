import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";
import { createNotification } from "@/lib/actions/notifications";

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

export async function createFollowup(session, leadId, data, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO lead_followups (company_id, lead_id, type, status, scheduled_at, next_follow_up, notes, created_by, updated_by)
     VALUES (?, ?, ?, 'Scheduled', ?, ?, ?, ?, ?)`,
    [session.company_id, leadId, data.type, data.scheduledAt, data.nextFollowUp || null, data.notes || null, createdBy, createdBy]
  );

  if (data.nextFollowUp) {
    await pool.query(`UPDATE leads SET next_follow_up = ? WHERE id = ? AND company_id = ?`, [data.nextFollowUp, leadId, session.company_id]);
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

  return result.insertId;
}

export async function completeFollowup(session, id, leadId, { outcome, nextFollowUp }, updatedBy) {
  await pool.query(
    `UPDATE lead_followups SET status = 'Completed', outcome = ?, next_follow_up = ?, updated_by = ? WHERE id = ? AND company_id = ?`,
    [outcome || null, nextFollowUp || null, updatedBy, id, session.company_id]
  );
  if (nextFollowUp) {
    await pool.query(`UPDATE leads SET next_follow_up = ? WHERE id = ? AND company_id = ?`, [nextFollowUp, leadId, session.company_id]);
  }
  await logActivity({ userId: updatedBy, module: "leads", action: "followup_completed", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Follow-up completed: ${outcome || "no outcome noted"}` });
}