import "server-only";
import { pool } from "@/lib/db";
import { formatBytes } from "@/lib/helpers/formatBytes";

export { formatBytes };

/**
 * Storage usage is computed on the fly from file_size columns already
 * present on employee_documents and lead_documents — no dedicated
 * storage-tracking table exists or is needed for this scope. Branding
 * logo uploads (src/lib/helpers/brandingUpload.js) are written straight to
 * /public/uploads with no DB row at all, so they're deliberately excluded
 * here — there'd be nothing to query. They're typically a handful of small
 * images per company and not the actual driver of storage usage.
 */
export async function getStorageUsage(session) {
  const [[plan]] = await pool.query(
    `SELECT p.max_storage_mb FROM company_subscriptions cs JOIN plans p ON p.id = cs.plan_id
     WHERE cs.company_id = ? ORDER BY cs.created_at DESC LIMIT 1`,
    [session.company_id]
  );
  const limitBytes = plan?.max_storage_mb ? plan.max_storage_mb * 1024 * 1024 : null;

  const [[byModule]] = await pool.query(
    `SELECT
      (SELECT COALESCE(SUM(file_size),0) FROM employee_documents WHERE company_id=? AND is_deleted=0) AS employee_bytes,
      (SELECT COALESCE(SUM(file_size),0) FROM lead_documents WHERE company_id=?) AS lead_bytes`,
    [session.company_id, session.company_id]
  );
  const usedBytes = Number(byModule.employee_bytes) + Number(byModule.lead_bytes);

  return {
    usedBytes,
    limitBytes,
    remainingBytes: limitBytes != null ? Math.max(0, limitBytes - usedBytes) : null,
    percentUsed: limitBytes ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : null,
    byModule: [
      { module: "Employee Documents", bytes: Number(byModule.employee_bytes) },
      { module: "Lead Documents", bytes: Number(byModule.lead_bytes) },
    ],
  };
}

/**
 * Server-side, pre-upload gate — the entire point is that a client-supplied
 * file size is never trusted for this check on its own; the ACTUAL buffer
 * length the upload code already measured is what gets passed in here,
 * before the file is written to storage. A plan with no configured
 * max_storage_mb (NULL) is treated as unlimited, matching getStorageUsage's
 * own null-means-unlimited convention.
 */
export async function enforceStorageLimit(companyId, additionalBytes) {
  const [[plan]] = await pool.query(
    `SELECT p.max_storage_mb FROM company_subscriptions cs JOIN plans p ON p.id = cs.plan_id
     WHERE cs.company_id = ? ORDER BY cs.created_at DESC LIMIT 1`,
    [companyId]
  );
  const limitBytes = plan?.max_storage_mb ? plan.max_storage_mb * 1024 * 1024 : null;
  if (limitBytes == null) return; // unlimited

  const [[byModule]] = await pool.query(
    `SELECT
      (SELECT COALESCE(SUM(file_size),0) FROM employee_documents WHERE company_id=? AND is_deleted=0) AS employee_bytes,
      (SELECT COALESCE(SUM(file_size),0) FROM lead_documents WHERE company_id=?) AS lead_bytes`,
    [companyId, companyId]
  );
  const usedBytes = Number(byModule.employee_bytes) + Number(byModule.lead_bytes);

  if (usedBytes + additionalBytes > limitBytes) {
    const e = new Error(`Storage limit reached (${formatBytes(usedBytes)} / ${formatBytes(limitBytes)} used). Delete files or upgrade the plan to upload more.`);
    e.status = 413;
    throw e;
  }
}

export async function getLargestFiles(session, limit = 10) {
  const [rows] = await pool.query(
    `SELECT id, 'Employee' AS source, file_name, file_size, u.name AS owner_name, ed.created_at
     FROM employee_documents ed JOIN users u ON u.id=ed.user_id
     WHERE ed.company_id=? AND ed.is_deleted=0
     UNION ALL
     SELECT id, 'Lead' AS source, file_name, file_size, l.name AS owner_name, ld.created_at
     FROM lead_documents ld JOIN leads l ON l.id=ld.lead_id
     WHERE ld.company_id=?
     ORDER BY file_size DESC LIMIT ?`,
    [session.company_id, session.company_id, limit]
  );
  return rows;
}

export async function getStorageByEmployee(session, limit = 10) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, COUNT(*) AS file_count, SUM(ed.file_size) AS total_bytes
     FROM employee_documents ed JOIN users u ON u.id=ed.user_id
     WHERE ed.company_id=? AND ed.is_deleted=0
     GROUP BY u.id, u.name ORDER BY total_bytes DESC LIMIT ?`,
    [session.company_id, limit]
  );
  return rows;
}

export async function getStorageByLead(session, limit = 10) {
  const [rows] = await pool.query(
    `SELECT l.id, l.name, l.lead_number, COUNT(*) AS file_count, SUM(ld.file_size) AS total_bytes
     FROM lead_documents ld JOIN leads l ON l.id=ld.lead_id
     WHERE ld.company_id=?
     GROUP BY l.id, l.name, l.lead_number ORDER BY total_bytes DESC LIMIT ?`,
    [session.company_id, limit]
  );
  return rows;
}

/** Platform-wide storage across every tenant, for the Platform Console. */
export async function getPlatformStorageUsage() {
  const [[totals]] = await pool.query(
    `SELECT
      (SELECT COALESCE(SUM(file_size),0) FROM employee_documents WHERE is_deleted=0) AS employee_bytes,
      (SELECT COALESCE(SUM(file_size),0) FROM lead_documents) AS lead_bytes`
  );
  const [byCompany] = await pool.query(
    `SELECT c.id, c.name,
       COALESCE((SELECT SUM(file_size) FROM employee_documents ed WHERE ed.company_id=c.id AND ed.is_deleted=0),0) +
       COALESCE((SELECT SUM(file_size) FROM lead_documents ld WHERE ld.company_id=c.id),0) AS total_bytes
     FROM companies c WHERE c.status != 'deleted'
     ORDER BY total_bytes DESC LIMIT 10`
  );
  return {
    usedBytes: Number(totals.employee_bytes) + Number(totals.lead_bytes),
    byCompany,
  };
}

