import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createLead, updateLead, assignLead, findDuplicateLead } from "@/lib/modules/crm/actions/leads";
import { LEAD_PRIORITIES } from "@/lib/modules/crm/constants/leadStages";
import { LEAD_IMPORT_FIELDS } from "@/lib/modules/crm/constants/leadImportFields";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
export const MAX_IMPORT_ROWS = 500; // matches the existing user-import cap — same architecture, same limit

/** Best-effort auto-match of file headers to CRM fields by loose name similarity. */
export function autoMapColumns(headers) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const mapping = {};
  headers.forEach((header, index) => {
    const h = normalize(header);
    const match = LEAD_IMPORT_FIELDS.find((f) => {
      const label = normalize(f.label.replace(/\(.*\)/, ""));
      const key = normalize(f.key);
      return h === label || h === key || h.includes(label) || label.includes(h);
    });
    if (match) mapping[index] = match.key;
  });
  return mapping;
}

async function loadLeadLookupMaps(companyId) {
  const [sources] = await pool.query(`SELECT id, name FROM lead_sources WHERE company_id=? AND is_deleted=0`, [companyId]);
  const [services] = await pool.query(`SELECT id, name FROM services WHERE company_id=? AND is_deleted=0`, [companyId]);
  const [users] = await pool.query(`SELECT id, name, email FROM users WHERE company_id=? AND is_deleted=0 AND status='active'`, [companyId]);

  const bySource = new Map(sources.map((s) => [s.name.toLowerCase(), s.id]));
  const byService = new Map(services.map((s) => [s.name.toLowerCase(), s.id]));
  const byUser = new Map();
  for (const u of users) { byUser.set(u.name.toLowerCase(), u.id); if (u.email) byUser.set(u.email.toLowerCase(), u.id); }
  return { bySource, byService, byUser };
}

function rowToRecord(row, mapping) {
  const record = {};
  for (const [colIndex, fieldKey] of Object.entries(mapping)) {
    if (!fieldKey) continue;
    record[fieldKey] = (row[Number(colIndex)] || "").trim();
  }
  return record;
}

/**
 * Validates every parsed row against the mapping + this company's real
 * lead sources/services/users, without writing anything. Mirrors the
 * shape of validateImportRows() in userImport.js (rowNumber/raw/
 * resolved/errors/status) so the wizard UI can reuse the same
 * preview/highlight patterns.
 */
export async function validateLeadImportRows(session, dataRows, mapping, { defaultLeadSourceId = null, defaultServiceId = null } = {}) {
  const { bySource, byService, byUser } = await loadLeadLookupMaps(session.company_id);
  const seenPhones = new Map();
  const seenEmails = new Map();

  const results = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2;
    if (row.every((cell) => !cell || !String(cell).trim())) continue; // silently skip fully empty rows

    const record = rowToRecord(row, mapping);
    const errors = [];

    if (!record.name) errors.push("Name is required.");
    if (!record.phone) errors.push("Phone is required.");
    else if (!PHONE_RE.test(record.phone)) errors.push("Phone format looks invalid.");
    if (record.email && !EMAIL_RE.test(record.email)) errors.push("Email format looks invalid.");

    let leadSourceId = defaultLeadSourceId;
    if (record.leadSourceName) {
      leadSourceId = bySource.get(record.leadSourceName.toLowerCase());
      if (!leadSourceId) errors.push(`Lead source "${record.leadSourceName}" not found.`);
    }
    if (!leadSourceId) errors.push("Lead source is required (map a column or pick a default).");

    let serviceId = defaultServiceId;
    if (record.serviceName) {
      serviceId = byService.get(record.serviceName.toLowerCase());
      if (!serviceId) errors.push(`Service "${record.serviceName}" not found.`);
    }
    if (!serviceId) errors.push("Service is required (map a column or pick a default).");

    let assignedTo = null;
    if (record.assignedToName) {
      assignedTo = byUser.get(record.assignedToName.toLowerCase());
      if (!assignedTo) errors.push(`Assigned user "${record.assignedToName}" not found.`);
    }

    let priority = "Medium";
    if (record.priority) {
      const match = LEAD_PRIORITIES.find((p) => p.toLowerCase() === record.priority.toLowerCase());
      if (!match) errors.push(`Priority "${record.priority}" is invalid — use one of: ${LEAD_PRIORITIES.join(", ")}.`);
      else priority = match;
    }

    let isDuplicate = false;
    let duplicateReason = null;
    let duplicateOfId = null;
    if (record.phone && seenPhones.has(record.phone)) { isDuplicate = true; duplicateReason = `Duplicate phone within this file (row ${seenPhones.get(record.phone)}).`; }
    if (record.email && seenEmails.has(record.email)) { isDuplicate = true; duplicateReason = `Duplicate email within this file (row ${seenEmails.get(record.email)}).`; }
    if (record.phone) seenPhones.set(record.phone, rowNumber);
    if (record.email) seenEmails.set(record.email, rowNumber);

    if (!isDuplicate && errors.length === 0 && record.phone) {
      const existing = await findDuplicateLead(session.company_id, { phone: record.phone, email: record.email });
      if (existing) { isDuplicate = true; duplicateOfId = existing.id; duplicateReason = `Matches existing lead ${existing.name} (${existing.phone}).`; }
    }

    results.push({
      rowNumber,
      raw: record,
      resolved: { leadSourceId, serviceId, assignedTo, priority },
      duplicateOfId,
      errors,
      isDuplicate,
      duplicateReason,
      status: errors.length > 0 ? "invalid" : isDuplicate ? "duplicate" : "valid",
    });
  }

  return {
    total: results.length,
    valid: results.filter((r) => r.status === "valid").length,
    invalid: results.filter((r) => r.status === "invalid").length,
    duplicate: results.filter((r) => r.status === "duplicate").length,
    rows: results,
  };
}

/**
 * Commits one chunk of already-validated rows. Called repeatedly by the
 * client (small batches) so the wizard can show real, not simulated,
 * progress — every call here is a real batch of work that already
 * completed before the response comes back.
 */
export async function commitLeadImportChunk(session, { rows, duplicateStrategy, importedBy }) {
  let importedCount = 0, updatedCount = 0, skippedCount = 0, failedCount = 0;
  const errorReport = [];

  for (const row of rows) {
    if (row.status === "invalid") {
      failedCount++;
      errorReport.push({ row: row.rowNumber, name: row.raw.name, phone: row.raw.phone, reason: row.errors.join("; ") });
      continue;
    }
    if (row.status === "duplicate") {
      if (duplicateStrategy === "skip") { skippedCount++; continue; }
      if (duplicateStrategy === "update" && row.duplicateOfId) {
        try {
          await updateLead(session, row.duplicateOfId, {
            name: row.raw.name, email: row.raw.email || undefined, whatsapp: row.raw.whatsapp || undefined,
            country: row.raw.country || undefined, state: row.raw.state || undefined, city: row.raw.city || undefined,
            priority: row.resolved.priority, tags: row.raw.tags || undefined, remarks: row.raw.remarks || undefined,
          }, importedBy);
          // updateLead() doesn't touch assignment (matches the manual-edit form,
          // which never does either) — assignLead() is the dedicated, history-
          // tracked path, so it's called explicitly here when the file specified one.
          if (row.resolved.assignedTo) await assignLead(session, row.duplicateOfId, row.resolved.assignedTo, importedBy);
          updatedCount++;
        } catch (err) {
          failedCount++;
          errorReport.push({ row: row.rowNumber, name: row.raw.name, phone: row.raw.phone, reason: err.message });
        }
        continue;
      }
      // duplicateStrategy === "import_anyway" falls through to createLead below,
      // which already flags is_duplicate/duplicate_of itself via findDuplicateLead.
    }

    try {
      const leadId = await createLead(session, {
        name: row.raw.name, phone: row.raw.phone, email: row.raw.email || null, whatsapp: row.raw.whatsapp || null,
        country: row.raw.country || null, state: row.raw.state || null, city: row.raw.city || null,
        leadSourceId: row.resolved.leadSourceId, serviceId: row.resolved.serviceId,
        priority: row.resolved.priority, tags: row.raw.tags || null, remarks: row.raw.remarks || null,
      }, importedBy);
      // createLead() doesn't set assigned_to either (leads are created
      // unassigned; assignLead() is the only path that assigns + records
      // lead_assignment_history + notifies the assignee) — same reuse as above.
      if (row.resolved.assignedTo) await assignLead(session, leadId, row.resolved.assignedTo, importedBy);
      importedCount++;
    } catch (err) {
      failedCount++;
      errorReport.push({ row: row.rowNumber, name: row.raw.name, phone: row.raw.phone, reason: err.message });
    }
  }

  return { importedCount, updatedCount, skippedCount, failedCount, errorReport };
}

/** Persists the aggregate history record once the client has run every chunk. */
export async function recordLeadImportHistory(session, {
  fileName, totalRows, importedCount, updatedCount, skippedCount, failedCount, duplicateCount,
  duplicateStrategy, mapping, errorReport, importedBy, durationMs,
}) {
  const [result] = await pool.query(
    `INSERT INTO lead_import_history (company_id, file_name, total_rows, imported_count, updated_count, skipped_count, failed_count, duplicate_count, duplicate_strategy, column_mapping, error_report, imported_by, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [session.company_id, fileName, totalRows, importedCount, updatedCount, skippedCount, failedCount, duplicateCount, duplicateStrategy, JSON.stringify(mapping), JSON.stringify(errorReport), importedBy, durationMs || null]
  );
  await logActivity({
    userId: importedBy, module: "leads", action: "import_complete", entityType: "lead_import_history", entityId: result.insertId,
    companyId: session.company_id, description: `Imported leads from ${fileName}: ${importedCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed`,
  });
  return result.insertId;
}

export async function listLeadImportHistory(session, limit = 20) {
  const [rows] = await pool.query(
    `SELECT h.*, u.name AS imported_by_name FROM lead_import_history h
     LEFT JOIN users u ON u.id = h.imported_by
     WHERE h.company_id = ?
     ORDER BY h.created_at DESC LIMIT ?`,
    [session.company_id, limit]
  );
  return rows;
}

export async function getLeadImportHistoryRow(session, id) {
  const [[row]] = await pool.query(`SELECT * FROM lead_import_history WHERE id=? AND company_id=?`, [id, session.company_id]);
  return row || null;
}

/** One example row so the template is self-explanatory without a separate instructions doc. */
export function buildLeadTemplateRow({ firstSourceName, firstServiceName } = {}) {
  return {
    name: "John Doe", phone: "+91 9876543210", email: "john.doe@example.com", whatsapp: "+91 9876543210",
    country: "India", state: "Maharashtra", city: "Mumbai",
    leadSourceName: firstSourceName || "Website", serviceName: firstServiceName || "General Enquiry",
    assignedToName: "", priority: "Medium", tags: "hot,follow-up", remarks: "Sample row — delete before uploading",
  };
}
