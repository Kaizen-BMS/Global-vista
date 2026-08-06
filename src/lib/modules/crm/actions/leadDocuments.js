import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function listLeadDocuments(session, leadId) {
  const [rows] = await pool.query(
    `SELECT d.*, u.name AS uploaded_by_name
     FROM lead_documents d LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.lead_id = ? AND d.company_id = ? ORDER BY d.created_at DESC`,
    [leadId, session.company_id]
  );
  return rows;
}

export async function addLeadDocument(session, leadId, { type, fileName, fileUrl, fileSize }, uploadedBy) {
  const [result] = await pool.query(
    `INSERT INTO lead_documents (company_id, lead_id, type, file_name, file_url, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [session.company_id, leadId, type, fileName, fileUrl, fileSize || null, uploadedBy]
  );
  await logActivity({ userId: uploadedBy, module: "leads", action: "document_upload", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Uploaded ${type} document: ${fileName}` });
  return result.insertId;
}

export async function deleteLeadDocument(session, id, leadId, deletedBy) {
  await pool.query(`DELETE FROM lead_documents WHERE id = ? AND company_id = ?`, [id, session.company_id]);
  await logActivity({ userId: deletedBy, module: "leads", action: "document_delete", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Deleted document #${id}` });
}