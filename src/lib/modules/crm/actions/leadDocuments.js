import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function listLeadDocuments(leadId) {
  const [rows] = await pool.query(
    `SELECT d.*, u.name AS uploaded_by_name
     FROM lead_documents d LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.lead_id = ? ORDER BY d.created_at DESC`,
    [leadId]
  );
  return rows;
}

export async function addLeadDocument(leadId, { type, fileName, fileUrl, fileSize }, uploadedBy) {
  const [result] = await pool.query(
    `INSERT INTO lead_documents (lead_id, type, file_name, file_url, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)`,
    [leadId, type, fileName, fileUrl, fileSize || null, uploadedBy]
  );
  await logActivity({ userId: uploadedBy, module: "leads", action: "document_upload", entityType: "lead", entityId: leadId, description: `Uploaded ${type} document: ${fileName}` });
  return result.insertId;
}

export async function deleteLeadDocument(id, leadId, deletedBy) {
  await pool.query(`DELETE FROM lead_documents WHERE id = ?`, [id]);
  await logActivity({ userId: deletedBy, module: "leads", action: "document_delete", entityType: "lead", entityId: leadId, description: `Deleted document #${id}` });
}