import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { uploadFile, deleteFile, getFileUrl } from "@/lib/services/StorageService";
import { enforceStorageLimit } from "@/lib/actions/storage";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx"];

async function assertLeadInCompany(session, leadId) {
  const [[lead]] = await pool.query(`SELECT id, assigned_to, name FROM leads WHERE id = ? AND company_id = ? AND is_deleted = 0`, [leadId, session.company_id]);
  if (!lead) { const e = new Error("Lead not found in this company."); e.status = 404; throw e; }
  return lead;
}

export async function listLeadDocuments(session, leadId) {
  await assertLeadInCompany(session, leadId);
  const [rows] = await pool.query(
    `SELECT d.id, d.type, d.file_name, d.file_size, d.created_at, d.uploaded_by, u.name AS uploaded_by_name
     FROM lead_documents d LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.lead_id = ? AND d.company_id = ? ORDER BY d.created_at DESC`,
    [leadId, session.company_id]
  );
  return rows;
}

/**
 * Private by design — same StorageService a signed-download route already
 * serves employee documents through. `file_url` stores the storage KEY,
 * not a public URL (matches the pre-existing employee_documents
 * convention); a real URL is only ever minted on demand, short-lived, and
 * only after the caller is proven to own this exact document.
 */
export async function uploadLeadDocument(session, leadId, { type, file }, uploadedBy) {
  const lead = await assertLeadInCompany(session, leadId);
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) { const e = new Error(`File type not allowed. Use: ${ALLOWED_EXT.join(", ")}.`); e.status = 400; throw e; }
  if (file.size > MAX_SIZE_BYTES) { const e = new Error(`File exceeds ${MAX_SIZE_BYTES / 1024 / 1024}MB limit.`); e.status = 400; throw e; }

  // Storage is capped by the company's subscription plan, checked BEFORE
  // the upload happens — rejecting after the fact would mean paying the
  // upload cost for nothing and still having to explain the failure.
  await enforceStorageLimit(session.company_id, file.size);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await uploadFile({ companyId: session.company_id, category: "lead-documents", buffer, fileName: file.name, mimeType: file.type, maxSizeBytes: MAX_SIZE_BYTES });

  const [result] = await pool.query(
    `INSERT INTO lead_documents (company_id, lead_id, type, file_name, file_url, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [session.company_id, leadId, type, file.name, key, file.size, uploadedBy]
  );

  await logActivity({ userId: uploadedBy, module: "leads", action: "document_upload", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Uploaded ${type} document: ${file.name}` });

  if (lead.assigned_to && lead.assigned_to !== uploadedBy) {
    await createNotification(session.company_id, lead.assigned_to, {
      title: "Document uploaded", message: `${type} document added to ${lead.name}`, type: "document_uploaded", link: `/workspace/lead-management/${leadId}`,
    });
  }
  return result.insertId;
}

/** Replace = delete the old stored file once the new one is safely uploaded, never before. */
export async function replaceLeadDocument(session, leadId, docId, { type, file }, uploadedBy) {
  const [[existing]] = await pool.query(`SELECT id, file_url FROM lead_documents WHERE id = ? AND lead_id = ? AND company_id = ?`, [docId, leadId, session.company_id]);
  if (!existing) { const e = new Error("Document not found."); e.status = 404; throw e; }

  const newId = await uploadLeadDocument(session, leadId, { type, file }, uploadedBy);
  await pool.query(`DELETE FROM lead_documents WHERE id = ? AND company_id = ?`, [docId, session.company_id]);
  deleteFile(existing.file_url).catch((err) => console.error("Old lead document delete failed:", err.message));
  await logActivity({ userId: uploadedBy, module: "leads", action: "document_replace", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Replaced document #${docId} with "${file.name}"` });
  return newId;
}

export async function deleteLeadDocument(session, id, leadId, deletedBy) {
  const [[doc]] = await pool.query(`SELECT file_url, file_name FROM lead_documents WHERE id = ? AND lead_id = ? AND company_id = ?`, [id, leadId, session.company_id]);
  if (!doc) { const e = new Error("Document not found."); e.status = 404; throw e; }
  await pool.query(`DELETE FROM lead_documents WHERE id = ? AND company_id = ?`, [id, session.company_id]);
  deleteFile(doc.file_url).catch((err) => console.error("Lead document delete failed:", err.message));
  await logActivity({ userId: deletedBy, module: "leads", action: "document_delete", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Deleted document "${doc.file_name}"` });
}

/** Signed, short-lived, and re-verified against company_id + lead_id on every call — never trust a cached URL. */
export async function getLeadDocumentDownloadUrl(session, leadId, docId) {
  const [[doc]] = await pool.query(`SELECT file_url, file_name FROM lead_documents WHERE id = ? AND lead_id = ? AND company_id = ?`, [docId, leadId, session.company_id]);
  if (!doc) { const e = new Error("Document not found."); e.status = 404; throw e; }
  return { url: await getFileUrl(doc.file_url), fileName: doc.file_name };
}
