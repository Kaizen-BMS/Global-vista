import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function listEmployeeDocumentTypes(session, { activeOnly = false } = {}) {
  const [rows] = await pool.query(
    `SELECT * FROM employee_document_types WHERE company_id=? AND is_deleted=0 ${activeOnly ? "AND status='active'" : ""} ORDER BY display_order ASC, name ASC`,
    [session.company_id]
  );
  return rows;
}

export async function getEmployeeDocumentType(session, id) {
  const [[row]] = await pool.query(`SELECT * FROM employee_document_types WHERE id=? AND company_id=? AND is_deleted=0 LIMIT 1`, [id, session.company_id]);
  return row || null;
}

export async function createEmployeeDocumentType(session, data, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO employee_document_types
     (company_id, name, description, is_required, allowed_file_types, max_file_size_mb, expiry_required, expiry_reminder_days,
      multiple_files_allowed, employee_visible, hr_visible, manager_visible, display_order, status, created_by, updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      session.company_id, data.name, data.description || null, data.isRequired ? 1 : 0,
      data.allowedFileTypes || "pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,zip", data.maxFileSizeMb || 10,
      data.expiryRequired ? 1 : 0, data.expiryReminderDays ?? 30, data.multipleFilesAllowed ? 1 : 0,
      data.employeeVisible !== false ? 1 : 0, data.hrVisible !== false ? 1 : 0, data.managerVisible ? 1 : 0,
      data.displayOrder || 0, data.status || "active", createdBy, createdBy,
    ]
  );
  await logActivity({ userId: createdBy, module: "settings", action: "document_type_create", entityType: "employee_document_type", entityId: result.insertId, description: `Created document type "${data.name}"`, companyId: session.company_id });
  return result.insertId;
}

export async function updateEmployeeDocumentType(session, id, data, updatedBy) {
  await pool.query(
    `UPDATE employee_document_types SET
       name=?, description=?, is_required=?, allowed_file_types=?, max_file_size_mb=?, expiry_required=?, expiry_reminder_days=?,
       multiple_files_allowed=?, employee_visible=?, hr_visible=?, manager_visible=?, display_order=?, status=?, updated_by=?
     WHERE id=? AND company_id=? AND is_deleted=0`,
    [
      data.name, data.description || null, data.isRequired ? 1 : 0, data.allowedFileTypes, data.maxFileSizeMb || 10,
      data.expiryRequired ? 1 : 0, data.expiryReminderDays ?? 30, data.multipleFilesAllowed ? 1 : 0,
      data.employeeVisible !== false ? 1 : 0, data.hrVisible !== false ? 1 : 0, data.managerVisible ? 1 : 0,
      data.displayOrder || 0, data.status || "active", updatedBy, id, session.company_id,
    ]
  );
  await logActivity({ userId: updatedBy, module: "settings", action: "document_type_update", entityType: "employee_document_type", entityId: id, description: `Updated document type "${data.name}"`, companyId: session.company_id });
}

export async function deleteEmployeeDocumentType(session, id, deletedBy) {
  await pool.query(`UPDATE employee_document_types SET is_deleted=1, deleted_at=NOW(), updated_by=? WHERE id=? AND company_id=?`, [deletedBy, id, session.company_id]);
  await logActivity({ userId: deletedBy, module: "settings", action: "document_type_delete", entityType: "employee_document_type", entityId: id, description: `Deleted document type #${id}`, companyId: session.company_id });
}
