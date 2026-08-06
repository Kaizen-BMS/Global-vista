import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function listEmployeeDocuments(userId) {
  const [rows] = await pool.query(
    `SELECT d.*, u.name AS uploaded_by_name
     FROM employee_documents d LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.user_id = ? ORDER BY d.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function addEmployeeDocument(userId, { type, fileName, fileUrl, fileSize }, uploadedBy) {
  const [result] = await pool.query(
    `INSERT INTO employee_documents (user_id, type, file_name, file_url, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, fileName, fileUrl, fileSize || null, uploadedBy]
  );
  await logActivity({ userId: uploadedBy, module: "users", action: "document_upload", entityType: "user", entityId: userId, description: `Uploaded ${type} for user #${userId}` });
  return result.insertId;
}

export async function deleteEmployeeDocument(id, userId, deletedBy) {
  await pool.query(`DELETE FROM employee_documents WHERE id = ?`, [id]);
  await logActivity({ userId: deletedBy, module: "users", action: "document_delete", entityType: "user", entityId: userId, description: `Deleted document #${id}` });
}