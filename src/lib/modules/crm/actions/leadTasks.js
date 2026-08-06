import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";

export async function listAllTasks(session, { includeCompleted = true } = {}) {
  const { where, params } = getVisibleLeadFilter(session);
  const completedFilter = includeCompleted ? "" : "AND t.is_completed = 0";
  const [rows] = await pool.query(
    `SELECT t.*, l.name AS lead_name, l.lead_number, u.name AS assigned_name
     FROM lead_tasks t
     JOIN leads l ON l.id = t.lead_id AND l.is_deleted = 0 AND ${where}
     LEFT JOIN users u ON u.id = t.assigned_to
     WHERE t.company_id = ? ${completedFilter}
     ORDER BY t.is_completed ASC, t.due_date ASC`,
    [...params, session.company_id]
  );
  return rows;
}

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
  if (data.assignedTo && data.assignedTo !== createdBy) {
    await createNotification(session.company_id, data.assignedTo, {
      title: "New task assigned to you",
      message: data.title,
      type: "task_assigned",
      link: `/workspace/lead-management/${leadId}`,
    });
  }
  return result.insertId;
}

export async function toggleTaskComplete(session, id, leadId, isCompleted, updatedBy) {
  const [[task]] = await pool.query(`SELECT title, created_by FROM lead_tasks WHERE id = ? AND company_id = ?`, [id, session.company_id]);
  await pool.query(`UPDATE lead_tasks SET is_completed = ?, updated_by = ? WHERE id = ? AND company_id = ?`, [isCompleted ? 1 : 0, updatedBy, id, session.company_id]);
  await logActivity({ userId: updatedBy, module: "leads", action: isCompleted ? "task_complete" : "task_reopen", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Task #${id} marked ${isCompleted ? "complete" : "incomplete"}` });
  if (isCompleted && task?.created_by && task.created_by !== updatedBy) {
    await createNotification(session.company_id, task.created_by, {
      title: "Task completed",
      message: task.title,
      type: "task_completed",
      link: `/workspace/lead-management/${leadId}`,
    });
  }
}