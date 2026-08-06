import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function listLeadTasks(leadId) {
  const [rows] = await pool.query(
    `SELECT t.*, u.name AS assigned_name
     FROM lead_tasks t LEFT JOIN users u ON u.id = t.assigned_to
     WHERE t.lead_id = ? ORDER BY t.is_completed ASC, t.due_date ASC`,
    [leadId]
  );
  return rows;
}

export async function createTask(leadId, data, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO lead_tasks (lead_id, title, description, assigned_to, priority, due_date, is_recurring, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [leadId, data.title, data.description || null, data.assignedTo || null, data.priority || "Medium", data.dueDate || null, data.isRecurring ? 1 : 0, createdBy, createdBy]
  );
  await logActivity({ userId: createdBy, module: "leads", action: "task_create", entityType: "lead", entityId: leadId, description: `Created task: ${data.title}` });
  return result.insertId;
}

export async function toggleTaskComplete(id, leadId, isCompleted, updatedBy) {
  await pool.query(`UPDATE lead_tasks SET is_completed = ?, updated_by = ? WHERE id = ?`, [isCompleted ? 1 : 0, updatedBy, id]);
  await logActivity({ userId: updatedBy, module: "leads", action: isCompleted ? "task_complete" : "task_reopen", entityType: "lead", entityId: leadId, description: `Task #${id} marked ${isCompleted ? "complete" : "incomplete"}` });
}