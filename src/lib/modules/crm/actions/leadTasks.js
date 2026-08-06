import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function listLeadTasks(session, leadId) {
  const [rows] = await pool.query(
    `SELECT t.*, u.name AS assigned_name
     FROM lead_tasks t LEFT JOIN users u ON u.id = t.assigned_to
     WHERE t.lead_id = ? AND t.company_id = ? ORDER BY t.is_completed ASC, t.due_date ASC`,
    [leadId, session.company_id]
  );
  return rows;
}

export async function createTask(session, leadId, data, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO lead_tasks (company_id, lead_id, title, description, assigned_to, priority, due_date, is_recurring, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [session.company_id, leadId, data.title, data.description || null, data.assignedTo || null, data.priority || "Medium", data.dueDate || null, data.isRecurring ? 1 : 0, createdBy, createdBy]
  );
  await logActivity({ userId: createdBy, module: "leads", action: "task_create", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Created task: ${data.title}` });
  return result.insertId;
}

export async function toggleTaskComplete(session, id, leadId, isCompleted, updatedBy) {
  await pool.query(`UPDATE lead_tasks SET is_completed = ?, updated_by = ? WHERE id = ? AND company_id = ?`, [isCompleted ? 1 : 0, updatedBy, id, session.company_id]);
  await logActivity({ userId: updatedBy, module: "leads", action: isCompleted ? "task_complete" : "task_reopen", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Task #${id} marked ${isCompleted ? "complete" : "incomplete"}` });
}