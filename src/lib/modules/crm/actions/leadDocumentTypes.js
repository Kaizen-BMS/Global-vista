import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function listLeadDocumentTypes(session, { activeOnly = false } = {}) {
  const [rows] = await pool.query(
    `SELECT * FROM lead_document_types WHERE company_id=? AND is_deleted=0 ${activeOnly ? "AND status='active'" : ""} ORDER BY display_order ASC, name ASC`,
    [session.company_id]
  );
  return rows;
}

export async function getLeadDocumentType(session, id) {
  const [[row]] = await pool.query(`SELECT * FROM lead_document_types WHERE id=? AND company_id=? AND is_deleted=0 LIMIT 1`, [id, session.company_id]);
  return row || null;
}

export async function createLeadDocumentType(session, data, actorId) {
  if (!data.name || !String(data.name).trim()) { const e = new Error("Document type name is required."); e.status = 400; throw e; }
  const [[{ maxOrder }]] = await pool.query(`SELECT COALESCE(MAX(display_order), -1) AS maxOrder FROM lead_document_types WHERE company_id=?`, [session.company_id]);
  const [result] = await pool.query(
    `INSERT INTO lead_document_types (company_id, name, description, is_required, display_order, status, created_by, updated_by) VALUES (?,?,?,?,?,?,?,?)`,
    [session.company_id, data.name.trim(), data.description || null, data.isRequired ? 1 : 0, maxOrder + 1, data.status || "active", actorId, actorId]
  );
  await logActivity({ userId: actorId, module: "leads", action: "document_type_create", entityType: "lead_document_type", entityId: result.insertId, companyId: session.company_id, description: `Created lead document type "${data.name}"` });
  return result.insertId;
}

export async function updateLeadDocumentType(session, id, data, actorId) {
  if (!data.name || !String(data.name).trim()) { const e = new Error("Document type name is required."); e.status = 400; throw e; }
  const existing = await getLeadDocumentType(session, id);
  if (!existing) { const e = new Error("Document type not found."); e.status = 404; throw e; }
  await pool.query(
    `UPDATE lead_document_types SET name=?, description=?, is_required=?, status=?, updated_by=? WHERE id=? AND company_id=? AND is_deleted=0`,
    [data.name.trim(), data.description || null, data.isRequired ? 1 : 0, data.status || "active", actorId, id, session.company_id]
  );
  await logActivity({ userId: actorId, module: "leads", action: "document_type_update", entityType: "lead_document_type", entityId: id, companyId: session.company_id, description: `Updated lead document type "${data.name}"` });
}

/** Soft delete — existing lead_documents rows keep their document_type_id (FK, not cascaded) so past uploads still show their type. */
export async function deleteLeadDocumentType(session, id, actorId) {
  const existing = await getLeadDocumentType(session, id);
  if (!existing) { const e = new Error("Document type not found."); e.status = 404; throw e; }
  await pool.query(`UPDATE lead_document_types SET is_deleted=1, status='inactive', updated_by=?, deleted_at=NOW(), deleted_by=? WHERE id=? AND company_id=?`, [actorId, actorId, id, session.company_id]);
  await logActivity({ userId: actorId, module: "leads", action: "document_type_delete", entityType: "lead_document_type", entityId: id, companyId: session.company_id, description: `Deleted lead document type "${existing.name}"` });
}

export async function reorderLeadDocumentTypes(session, orderedIds, actorId) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.query(`UPDATE lead_document_types SET display_order=?, updated_by=? WHERE id=? AND company_id=?`, [i, actorId, orderedIds[i], session.company_id]);
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}
