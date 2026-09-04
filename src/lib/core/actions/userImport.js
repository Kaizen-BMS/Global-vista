import "server-only";
import * as XLSX from "xlsx";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { sendWelcomeEmail } from "@/lib/helpers/email";
import { CANONICAL_FIELDS } from "@/lib/core/import/userImport";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 500; // hard cap — protects the request from an accidental 50k-row upload

export function parseSpreadsheet(buffer, fileSizeBytes) {
  if (fileSizeBytes > MAX_FILE_BYTES) {
    const err = new Error("File exceeds 5MB limit.");
    err.status = 400;
    throw err;
  }
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false });

  if (rows.length === 0) {
    const err = new Error("File is empty.");
    err.status = 400;
    throw err;
  }
  if (rows.length - 1 > MAX_PREVIEW_ROWS) {
    const err = new Error(`File has ${rows.length - 1} data rows, exceeding the ${MAX_PREVIEW_ROWS}-row import limit. Split it into smaller files.`);
    err.status = 400;
    throw err;
  }

  const headers = rows[0].map((h) => String(h ?? "").trim());
  const dataRows = rows.slice(1).map((r) => headers.map((_, i) => String(r[i] ?? "").trim()));
  return { headers, dataRows };
}

async function loadLookupMaps(companyId) {
  const [[roles], [departments], [designations], [branches], [employeeTypes]] = await Promise.all([
    // Strictly this company's own roles — every company already has its
    // own cloned copy of every role (see provisioning.js), so matching a
    // CSV row's role name against the company_id-IS-NULL templates too
    // risked an ambiguous match (two rows named "Admin") resolving to
    // whichever one happened to be processed last.
    pool.query(`SELECT id, name FROM roles WHERE is_deleted = 0 AND company_id = ?`, [companyId]),
    pool.query(`SELECT id, name FROM departments WHERE is_deleted = 0 AND company_id = ?`, [companyId]),
    pool.query(`SELECT id, name FROM designations WHERE is_deleted = 0`),
    pool.query(`SELECT id, name FROM branches WHERE is_deleted = 0 AND company_id = ?`, [companyId]),
    pool.query(`SELECT id, name FROM employee_types WHERE is_deleted = 0`),
  ]);

  const toMap = (rows) => new Map(rows.map((r) => [r.name.toLowerCase(), r.id]));
  return {
    roles: toMap(roles),
    departments: toMap(departments),
    designations: toMap(designations),
    branches: toMap(branches),
    employeeTypes: toMap(employeeTypes),
  };
}

/**
 * Applies the column mapping to raw rows, validates each row, checks
 * duplicates against the DB and within the file itself, and resolves
 * name-based lookups (role/department/etc.) to IDs. Does NOT write
 * anything — pure validation pass.
 */
export async function validateImportRows(dataRows, mapping, companyId) {
  const lookups = await loadLookupMaps(companyId);

  const fieldByIndex = {};
  Object.entries(mapping).forEach(([index, key]) => {
    fieldByIndex[Number(index)] = key;
  });

  function extract(row) {
    const record = {};
    for (const [index, key] of Object.entries(fieldByIndex)) {
      record[key] = row[Number(index)] || "";
    }
    return record;
  }

  const emails = dataRows.map((r) => extract(r).email?.toLowerCase()).filter(Boolean);
  const employeeIds = dataRows.map((r) => extract(r).employeeId).filter(Boolean);

  const existingEmails = new Set();
  const existingEmployeeIds = new Set();
  if (emails.length) {
    const [rows] = await pool.query(`SELECT email FROM users WHERE email IN (?)`, [emails]);
    rows.forEach((r) => existingEmails.add(r.email.toLowerCase()));
  }
  if (employeeIds.length) {
    const [rows] = await pool.query(`SELECT employee_id FROM users WHERE employee_id IN (?)`, [employeeIds]);
    rows.forEach((r) => r.employee_id && existingEmployeeIds.add(r.employee_id));
  }

  const seenEmailsInFile = new Set();
  const seenEmployeeIdsInFile = new Set();

  const results = dataRows.map((row, i) => {
    const record = extract(row);
    const errors = [];
    let isDuplicate = false;
    let duplicateReason = null;

    const nameField = CANONICAL_FIELDS.find((f) => f.key === "name");
    if (nameField.required && !record.name) errors.push("Name is required.");

    if (!record.email) {
      errors.push("Email is required.");
    } else if (!EMAIL_RE.test(record.email)) {
      errors.push("Invalid email format.");
    } else {
      const lower = record.email.toLowerCase();
      if (existingEmails.has(lower)) { isDuplicate = true; duplicateReason = "Email already exists in system."; }
      else if (seenEmailsInFile.has(lower)) { isDuplicate = true; duplicateReason = "Duplicate email within this file."; }
      seenEmailsInFile.add(lower);
    }

    if (record.phone && !PHONE_RE.test(record.phone)) errors.push("Invalid phone format.");

    if (record.employeeId) {
      if (existingEmployeeIds.has(record.employeeId)) { isDuplicate = true; duplicateReason = duplicateReason || "Employee ID already exists in system."; }
      else if (seenEmployeeIdsInFile.has(record.employeeId)) { isDuplicate = true; duplicateReason = duplicateReason || "Duplicate Employee ID within this file."; }
      seenEmployeeIdsInFile.add(record.employeeId);
    }

    let roleId = null;
    if (!record.roleName) {
      errors.push("Role is required.");
    } else {
      roleId = lookups.roles.get(record.roleName.toLowerCase());
      if (!roleId) errors.push(`Role "${record.roleName}" not found. Check spelling or create it first.`);
    }

    let departmentId = null;
    if (record.departmentName) {
      departmentId = lookups.departments.get(record.departmentName.toLowerCase());
      if (!departmentId) errors.push(`Department "${record.departmentName}" not found.`);
    }

    let designationId = null;
    if (record.designationName) {
      designationId = lookups.designations.get(record.designationName.toLowerCase());
      if (!designationId) errors.push(`Designation "${record.designationName}" not found.`);
    }

    let branchId = null;
    if (record.branchName) {
      branchId = lookups.branches.get(record.branchName.toLowerCase());
      if (!branchId) errors.push(`Branch "${record.branchName}" not found.`);
    }

    let employeeTypeId = null;
    if (record.employeeTypeName) {
      employeeTypeId = lookups.employeeTypes.get(record.employeeTypeName.toLowerCase());
      if (!employeeTypeId) errors.push(`Employee Type "${record.employeeTypeName}" not found.`);
    }

    return {
      rowNumber: i + 2, // +1 for 0-index, +1 for header row
      raw: record,
      resolved: { roleId, departmentId, designationId, branchId, employeeTypeId },
      errors,
      isDuplicate,
      duplicateReason,
      status: errors.length > 0 ? "invalid" : isDuplicate ? "duplicate" : "valid",
    };
  });

  return {
    total: results.length,
    valid: results.filter((r) => r.status === "valid").length,
    invalid: results.filter((r) => r.status === "invalid").length,
    duplicate: results.filter((r) => r.status === "duplicate").length,
    rows: results,
  };
}

/**
 * Imports a set of already-validated rows. Each user is created inside
 * its own short transaction (not one giant transaction for the whole
 * batch) so one bad row can't roll back rows that already succeeded —
 * partial success is reported accurately in the summary rather than
 * silently losing valid imports to one unrelated failure.
 */
export async function commitImport({ rows, fileName, skipDuplicates, sendWelcomeEmails, importedBy, companyId }) {
  let importedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const errorReport = [];

  const rowsToProcess = rows.filter((r) => {
    if (r.status === "invalid") { failedCount++; errorReport.push({ row: r.rowNumber, email: r.raw.email, reason: r.errors.join("; ") }); return false; }
    if (r.status === "duplicate") {
      if (skipDuplicates) { skippedCount++; return false; }
      // Not skipping duplicates means treat as failed — we never
      // silently create a second account for an existing email.
      failedCount++; errorReport.push({ row: r.rowNumber, email: r.raw.email, reason: r.duplicateReason });
      return false;
    }
    return true;
  });

  const [[importCompany]] = await pool.query(`SELECT slug FROM companies WHERE id = ?`, [companyId]);
  const employeeIdPrefix = (importCompany?.slug || "EMP").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "EMP";

  for (const row of rowsToProcess) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
      const passwordHash = await hashPassword(tempPassword);

      // employee_id carries a GLOBAL unique constraint (not scoped to
      // company_id), so a prefix shared by every tenant — and a bare
      // COUNT(*) with no company_id filter at all — guaranteed collisions
      // against other companies' users almost immediately. Prefix is
      // per-tenant (from the company's slug); the number is MAX(existing
      // suffix) for that prefix, which — unlike COUNT — never goes
      // backwards when a user is deleted, and is re-checked with a retry
      // below for the residual race between concurrent inserts.
      let employeeId = row.raw.employeeId;
      let result;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (!row.raw.employeeId) {
          const [[{ maxNum }]] = await conn.query(
            `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(employee_id, '-', -1) AS UNSIGNED)), 0) AS maxNum
             FROM users WHERE company_id = ? AND employee_id LIKE ?`,
            [companyId, `${employeeIdPrefix}-%`]
          );
          employeeId = `${employeeIdPrefix}-${String(maxNum + 1).padStart(5, "0")}`;
        }
        try {
          [result] = await conn.query(
            `INSERT INTO users (company_id, employee_id, name, email, phone, password_hash, role_id, department_id, designation_id, branch_id, employee_type_id, joining_date, must_change_password, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              companyId, employeeId, row.raw.name, row.raw.email.trim().toLowerCase(), row.raw.phone || null, passwordHash,
              row.resolved.roleId, row.resolved.departmentId, row.resolved.designationId, row.resolved.branchId, row.resolved.employeeTypeId,
              row.raw.joiningDate || null, importedBy, importedBy,
            ]
          );
          break;
        } catch (err) {
          if (row.raw.employeeId || err.code !== "ER_DUP_ENTRY" || !/'employee_id'/.test(err.sqlMessage || "") || attempt >= 4) throw err;
        }
      }

      await conn.commit();
      importedCount++;

      await logActivity({ userId: importedBy, module: "users", action: "import_create", entityType: "user", entityId: result.insertId, companyId, description: `Imported user ${row.raw.name} from ${fileName}` });

      if (sendWelcomeEmails) {
        const [[role]] = await pool.query(`SELECT name FROM roles WHERE id = ?`, [row.resolved.roleId]);
        sendWelcomeEmail({ to: row.raw.email, userId: result.insertId, name: row.raw.name, email: row.raw.email, tempPassword, roleName: role?.name || "Employee", createdBy: importedBy })
          .catch((err) => console.error("Import welcome email failed:", err.message));
      }
    } catch (err) {
      await conn.rollback();
      failedCount++;
      errorReport.push({ row: row.rowNumber, email: row.raw.email, reason: err.code === "ER_DUP_ENTRY" ? "Duplicate entry (race condition)." : err.message });
    } finally {
      conn.release();
    }
  }

  const [historyResult] = await pool.query(
    `INSERT INTO user_import_history (company_id, file_name, total_rows, imported_count, skipped_count, failed_count, duplicate_count, error_report, imported_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, fileName, rows.length, importedCount, skippedCount, failedCount, rows.filter((r) => r.status === "duplicate").length, JSON.stringify(errorReport), importedBy]
  );

  await logActivity({
    userId: importedBy, module: "users", action: "import_complete", entityType: "user_import_history",
    entityId: historyResult.insertId, companyId, description: `Import complete: ${importedCount} imported, ${skippedCount} skipped, ${failedCount} failed`,
  });

  return { importedCount, skippedCount, failedCount, errorReport, historyId: historyResult.insertId };
}

export async function listImportHistory(companyId, limit = 20) {
  const [rows] = await pool.query(
    `SELECT h.*, u.name AS imported_by_name FROM user_import_history h
     LEFT JOIN users u ON u.id = h.imported_by
     WHERE h.company_id = ?
     ORDER BY h.created_at DESC LIMIT ?`,
    [companyId, limit]
  );
  return rows;
}