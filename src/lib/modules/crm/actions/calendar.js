import "server-only";
import { pool } from "@/lib/db";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";

export async function getCalendarEvents(session, { start, end }) {
  const { where, params } = await getVisibleLeadFilter(session);

  const [followups] = await pool.query(
    `SELECT f.id, f.type, f.status, f.scheduled_at AS at, l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone
     FROM lead_followups f JOIN leads l ON l.id = f.lead_id AND l.is_deleted=0 AND ${where}
     WHERE f.scheduled_at BETWEEN ? AND ?
     ORDER BY f.scheduled_at ASC`,
    [...params, start, end]
  );

  const [tasks] = await pool.query(
    `SELECT t.id, t.title, t.is_completed, t.due_date AS at, l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone
     FROM lead_tasks t JOIN leads l ON l.id = t.lead_id AND l.is_deleted=0 AND ${where}
     WHERE t.due_date BETWEEN ? AND ?
     ORDER BY t.due_date ASC`,
    [...params, start, end]
  );

  const events = [
    ...followups.map((f) => ({ id: `f${f.id}`, kind: "followup", label: f.type, status: f.status, at: f.at, leadId: f.lead_id, leadName: f.lead_name, leadPhone: f.lead_phone })),
    ...tasks.map((t) => ({ id: `t${t.id}`, kind: "task", label: t.title, status: t.is_completed ? "Completed" : "Pending", at: t.at, leadId: t.lead_id, leadName: t.lead_name, leadPhone: t.lead_phone })),
  ];
  events.sort((a, b) => new Date(a.at) - new Date(b.at));
  return events;
}
