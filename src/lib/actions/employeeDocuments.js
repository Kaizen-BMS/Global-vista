import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { uploadFile, deleteFile, getFileUrl } from "@/lib/services/StorageService";

const NOT_DELETED = "is_deleted = 0";

async function usersWithDocumentManagePermission(companyId) {
  const [rows] = await pool.query(
    `SELECT u.id FROM users u
     WHERE u.company_id = ? AND u.is_deleted = 0 AND u.status = 'active'
       AND (u.is_super_admin = 1 OR EXISTS (
         SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = u.role_id AND p.slug = 'employee_documents.manage' AND p.status = 'active'
       ))`,
    [companyId]
  );
  return rows.map((r) => r.id);
}

async function notifyMany(companyId, userIds, payload) {
  await Promise.all([...new Set(userIds)].filter(Boolean).map((userId) => createNotification(companyId, userId, payload)));
}

/** Every active document type for the company, joined with this employee's latest row per type (or null if never uploaded). */
export async function listEmployeeDocuments(session, userId) {
  const [types] = await pool.query(
    `SELECT * FROM employee_document_types WHERE company_id=? AND is_deleted=0 ORDER BY display_order ASC, name ASC`,
    [session.company_id]
  );
  const [docs] = await pool.query(
    `SELECT d.*, u.name AS uploaded_by_name, r.name AS reviewed_by_name
     FROM employee_documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     LEFT JOIN users r ON r.id = d.reviewed_by
     WHERE d.user_id=? AND d.company_id=? AND d.${NOT_DELETED} ORDER BY d.created_at DESC`,
    [userId, session.company_id]
  );

  const byType = new Map();
  for (const doc of docs) {
    if (!byType.has(doc.document_type_id)) byType.set(doc.document_type_id, []);
    byType.get(doc.document_type_id).push(doc);
  }

  return types
    .filter((t) => t.status === "active")
    .map((type) => ({ type, documents: byType.get(type.id) || [] }));
}

export function summarizeEmployeeDocuments(rows) {
  const required = rows.filter((r) => r.type.is_required);
  const summary = { required: required.length, uploaded: 0, pending: 0, approved: 0, rejected: 0, expired: 0, missing: 0 };
  for (const { type, documents } of required) {
    if (documents.length === 0) { summary.missing += 1; continue; }
    const latest = documents[0];
    summary.uploaded += 1;
    if (latest.status === "Approved") summary.approved += 1;
    else if (latest.status === "Rejected") summary.rejected += 1;
    else if (latest.status === "Expired") summary.expired += 1;
    else summary.pending += 1;
  }
  summary.progressPercent = summary.required > 0 ? Math.round((summary.approved / summary.required) * 100) : 100;
  return summary;
}

export async function uploadEmployeeDocument(session, userId, documentTypeId, { buffer, fileName, mimeType, expiryDate }, uploadedBy) {
  const [[docType]] = await pool.query(`SELECT * FROM employee_document_types WHERE id=? AND company_id=? AND is_deleted=0 AND status='active' LIMIT 1`, [documentTypeId, session.company_id]);
  if (!docType) { const e = new Error("Unknown or inactive document type."); e.status = 400; throw e; }

  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const allowed = (docType.allowed_file_types || "").split(",").map((t) => t.trim().toLowerCase());
  if (!allowed.includes(ext)) { const e = new Error(`This document only accepts: ${docType.allowed_file_types}`); e.status = 400; throw e; }

  if (!docType.multiple_files_allowed) {
    const [existing] = await pool.query(`SELECT id, file_url FROM employee_documents WHERE user_id=? AND document_type_id=? AND ${NOT_DELETED}`, [userId, documentTypeId]);
    for (const row of existing) {
      await pool.query(`UPDATE employee_documents SET is_deleted=1, deleted_at=NOW(), deleted_by=? WHERE id=?`, [uploadedBy, row.id]);
      deleteFile(row.file_url).catch(() => {});
    }
  }

  const { key } = await uploadFile({
    companyId: session.company_id, category: `employee-documents/${userId}`, buffer, fileName, mimeType,
    maxSizeBytes: docType.max_file_size_mb * 1024 * 1024,
  });

  const [result] = await pool.query(
    `INSERT INTO employee_documents (company_id, document_type_id, user_id, file_name, file_url, file_size, status, expiry_date, uploaded_by)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [session.company_id, documentTypeId, userId, fileName, key, buffer.length, "Pending", expiryDate || null, uploadedBy]
  );

  await logActivity({ userId: uploadedBy, module: "users", action: "document_upload", entityType: "user", entityId: userId, description: `Uploaded "${docType.name}"`, companyId: session.company_id });

  const reviewers = await usersWithDocumentManagePermission(session.company_id);
  await notifyMany(session.company_id, reviewers, {
    title: "Document uploaded", message: `${docType.name} was uploaded and needs review.`, type: "info", link: `/workspace/users/${userId}`,
  });

  return result.insertId;
}

export async function deleteEmployeeDocument(session, id, userId, deletedBy) {
  const [[doc]] = await pool.query(`SELECT file_url FROM employee_documents WHERE id=? AND user_id=? AND company_id=? AND ${NOT_DELETED} LIMIT 1`, [id, userId, session.company_id]);
  if (!doc) return;
  await pool.query(`UPDATE employee_documents SET is_deleted=1, deleted_at=NOW(), deleted_by=? WHERE id=?`, [deletedBy, id]);
  deleteFile(doc.file_url).catch(() => {});
  await logActivity({ userId: deletedBy, module: "users", action: "document_delete", entityType: "user", entityId: userId, description: `Deleted document #${id}`, companyId: session.company_id });
}

export async function getEmployeeDocumentDownloadUrl(session, id, userId) {
  const [[doc]] = await pool.query(`SELECT file_url, file_name FROM employee_documents WHERE id=? AND user_id=? AND company_id=? AND ${NOT_DELETED} LIMIT 1`, [id, userId, session.company_id]);
  if (!doc) return null;
  return { url: await getFileUrl(doc.file_url), fileName: doc.file_name };
}

const REVIEW_STATUS = { approve: "Approved", reject: "Rejected", request_reupload: "Re-upload Requested" };
const REVIEW_MESSAGE = { approve: "was approved", reject: "was rejected", request_reupload: "needs to be re-uploaded" };

export async function reviewEmployeeDocument(session, id, action, remarks, reviewedBy) {
  const status = REVIEW_STATUS[action];
  if (!status) { const e = new Error("Invalid review action."); e.status = 400; throw e; }

  const [[doc]] = await pool.query(
    `SELECT d.user_id, dt.name AS type_name FROM employee_documents d JOIN employee_document_types dt ON dt.id=d.document_type_id
     WHERE d.id=? AND d.company_id=? AND d.${NOT_DELETED} LIMIT 1`,
    [id, session.company_id]
  );
  if (!doc) { const e = new Error("Document not found."); e.status = 404; throw e; }

  await pool.query(`UPDATE employee_documents SET status=?, remarks=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?`, [status, remarks || null, reviewedBy, id]);
  await logActivity({ userId: reviewedBy, module: "users", action: `document_${action}`, entityType: "user", entityId: doc.user_id, description: `${doc.type_name} ${REVIEW_MESSAGE[action]}${remarks ? `: ${remarks}` : ""}`, companyId: session.company_id });

  const [[employee]] = await pool.query(`SELECT reporting_manager_id FROM users WHERE id=?`, [doc.user_id]);
  await notifyMany(session.company_id, [doc.user_id, employee?.reporting_manager_id], {
    title: `Document ${status.toLowerCase()}`, message: `${doc.type_name} ${REVIEW_MESSAGE[action]}.${remarks ? ` "${remarks}"` : ""}`,
    type: action === "reject" ? "warning" : "success", link: "/workspace/profile",
  });
}

/** Required types with no live document row for this employee. */
export async function getMissingDocumentTypes(session, userId) {
  const [rows] = await pool.query(
    `SELECT dt.* FROM employee_document_types dt
     WHERE dt.company_id=? AND dt.is_deleted=0 AND dt.status='active' AND dt.is_required=1
       AND NOT EXISTS (SELECT 1 FROM employee_documents d WHERE d.document_type_id=dt.id AND d.user_id=? AND d.${NOT_DELETED})
     ORDER BY dt.display_order ASC`,
    [session.company_id, userId]
  );
  return rows;
}

// ---- Dashboard widgets ----

export async function getEmployeesWithMissingDocuments(session, limit = 10) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, COUNT(dt.id) AS missing_count
     FROM users u
     JOIN employee_document_types dt ON dt.company_id=u.company_id AND dt.is_deleted=0 AND dt.status='active' AND dt.is_required=1
     LEFT JOIN employee_documents d ON d.document_type_id=dt.id AND d.user_id=u.id AND d.is_deleted=0
     WHERE u.company_id=? AND u.is_deleted=0 AND u.status='active' AND d.id IS NULL
     GROUP BY u.id, u.name ORDER BY missing_count DESC LIMIT ?`,
    [session.company_id, limit]
  );
  return rows;
}

export async function getPendingApprovalDocuments(session, limit = 10) {
  const [rows] = await pool.query(
    `SELECT d.id, d.user_id, d.file_name, d.created_at, u.name AS employee_name, dt.name AS type_name
     FROM employee_documents d JOIN users u ON u.id=d.user_id JOIN employee_document_types dt ON dt.id=d.document_type_id
     WHERE d.company_id=? AND d.${NOT_DELETED} AND d.status='Pending' ORDER BY d.created_at ASC LIMIT ?`,
    [session.company_id, limit]
  );
  return rows;
}

export async function getExpiringDocuments(session, withinDays = 30, limit = 10) {
  const [rows] = await pool.query(
    `SELECT d.id, d.expiry_date, u.name AS employee_name, dt.name AS type_name
     FROM employee_documents d JOIN users u ON u.id=d.user_id JOIN employee_document_types dt ON dt.id=d.document_type_id
     WHERE d.company_id=? AND d.${NOT_DELETED} AND d.status IN ('Approved','Uploaded') AND d.expiry_date IS NOT NULL
       AND d.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
     ORDER BY d.expiry_date ASC LIMIT ?`,
    [session.company_id, withinDays, limit]
  );
  return rows;
}

export async function getRecentlyUploadedDocuments(session, limit = 10) {
  const [rows] = await pool.query(
    `SELECT d.id, d.file_name, d.created_at, u.name AS employee_name, dt.name AS type_name
     FROM employee_documents d JOIN users u ON u.id=d.user_id JOIN employee_document_types dt ON dt.id=d.document_type_id
     WHERE d.company_id=? AND d.${NOT_DELETED} ORDER BY d.created_at DESC LIMIT ?`,
    [session.company_id, limit]
  );
  return rows;
}

export async function getRejectedDocuments(session, limit = 10) {
  const [rows] = await pool.query(
    `SELECT d.id, d.file_name, d.remarks, u.name AS employee_name, dt.name AS type_name
     FROM employee_documents d JOIN users u ON u.id=d.user_id JOIN employee_document_types dt ON dt.id=d.document_type_id
     WHERE d.company_id=? AND d.${NOT_DELETED} AND d.status='Rejected' ORDER BY d.reviewed_at DESC LIMIT ?`,
    [session.company_id, limit]
  );
  return rows;
}

/** Marks approved documents past their expiry date as Expired and notifies the employee + reviewers.
 * Not wired to a scheduler by this change — see the Employee Documents feature notes for how to trigger it. */
export async function runExpiryMaintenance(session) {
  const [expired] = await pool.query(
    `SELECT d.id, d.user_id, dt.name AS type_name FROM employee_documents d JOIN employee_document_types dt ON dt.id=d.document_type_id
     WHERE d.company_id=? AND d.${NOT_DELETED} AND d.status IN ('Approved','Uploaded') AND d.expiry_date IS NOT NULL AND d.expiry_date < CURDATE()`,
    [session.company_id]
  );
  for (const doc of expired) {
    await pool.query(`UPDATE employee_documents SET status='Expired' WHERE id=?`, [doc.id]);
    const [[employee]] = await pool.query(`SELECT reporting_manager_id FROM users WHERE id=?`, [doc.user_id]);
    await notifyMany(session.company_id, [doc.user_id, employee?.reporting_manager_id, ...(await usersWithDocumentManagePermission(session.company_id))], {
      title: "Document expired", message: `${doc.type_name} has expired and needs renewal.`, type: "warning", link: "/workspace/profile",
    });
  }

  const [expiringSoon] = await pool.query(
    `SELECT d.id, d.user_id, d.expiry_date, dt.name AS type_name, dt.expiry_reminder_days
     FROM employee_documents d JOIN employee_document_types dt ON dt.id=d.document_type_id
     WHERE d.company_id=? AND d.${NOT_DELETED} AND d.status IN ('Approved','Uploaded') AND d.expiry_date IS NOT NULL
       AND d.expiry_date >= CURDATE() AND d.expiry_date <= DATE_ADD(CURDATE(), INTERVAL dt.expiry_reminder_days DAY)`,
    [session.company_id]
  );
  for (const doc of expiringSoon) {
    await notifyMany(session.company_id, [doc.user_id], {
      title: "Document expiring soon", message: `${doc.type_name} expires on ${new Date(doc.expiry_date).toDateString()}.`, type: "warning", link: "/workspace/profile",
    });
  }
  return { expiredCount: expired.length, expiringSoonCount: expiringSoon.length };
}

/** Flat rows for the Employee Documents report/export — one row per uploaded document, plus company-wide required-type context. */
export async function listEmployeeDocumentsForReport(session) {
  const [rows] = await pool.query(
    `SELECT u.name AS employee_name, u.employee_id, br.name AS branch_name, dep.name AS department_name,
            dt.name AS document_type, d.status, d.expiry_date, d.created_at, d.file_name, up.name AS uploaded_by_name
     FROM employee_documents d
     JOIN users u ON u.id=d.user_id
     JOIN employee_document_types dt ON dt.id=d.document_type_id
     LEFT JOIN branches br ON br.id=u.branch_id
     LEFT JOIN departments dep ON dep.id=u.department_id
     LEFT JOIN users up ON up.id=d.uploaded_by
     WHERE d.company_id=? AND d.${NOT_DELETED}
     ORDER BY d.created_at DESC`,
    [session.company_id]
  );
  return rows;
}
