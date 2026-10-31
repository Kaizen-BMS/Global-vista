import "server-only";
import * as XLSX from "xlsx";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createLead, updateLead, updateLeadStage, assignLead, findDuplicateLead } from "@/lib/modules/crm/actions/leads";
import { addLeadNote } from "@/lib/modules/crm/actions/leadNotes";
import { createFollowupFromImport } from "@/lib/modules/crm/actions/leadFollowups";
import { getLeadPipelineStages } from "@/lib/modules/crm/actions/leadPipelineStages";
import { listLeadCustomFields, saveLeadCustomFieldValues } from "@/lib/modules/crm/actions/leadCustomFields";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { zonedTimeToUtc } from "@/lib/helpers/dateRange";
import { LEAD_PRIORITIES, FOLLOWUP_TYPES } from "@/lib/modules/crm/constants/leadStages";
import { getLeadImportFields } from "@/lib/modules/crm/constants/leadImportFields";

// record.<key> -> that company's lead_custom_fields.field_key — only
// consulted for child companies (see SUB_COMPANY_ONLY_KEYS), so a stray
// mapping on a non-child company's import is already stripped before this
// is ever read.
const CUSTOM_FIELD_IMPORT_KEYS = {
  stream: "stream", district: "district", schoolName: "school_name",
  academicYear: "academic_year", class: "class", subjects: "subjects", parentMobile: "parent_mobile",
  parentName: "parent_name", registrationNumber: "registration_number",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
export const MAX_IMPORT_ROWS = 500; // matches the existing user-import cap — same architecture, same limit

// A human-typed string (either date-only or date+time, space- or
// T-separated — deliberately NOT a free-form Date.parse, which would
// silently guess wrong between MM/DD and DD/MM) or a raw Excel numeric
// date serial (cells arrive this way since the spreadsheet parser doesn't
// use cellDates:true — see parseSpreadsheet() in userImport.js). Returns
// a real JS Date (UTC instant) in the company's own timezone, or null if
// unparseable — never throws, since an unparseable note date should
// warn, not fail, the whole row (see validateLeadImportRows below).
function parseImportNoteDate(value, timeZone) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    try {
      const d = XLSX.SSF.parse_date_code(value);
      if (!d) return null;
      return zonedTimeToUtc(d.y, d.m, d.d, d.H || 0, d.M || 0, Math.floor(d.S || 0), timeZone);
    } catch { return null; }
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(value).trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return zonedTimeToUtc(Number(y), Number(mo), Number(d), Number(h || 0), Number(mi || 0), Number(s || 0), timeZone);
}

/** Best-effort auto-match of file headers to CRM fields by loose name similarity. */
export function autoMapColumns(headers, isChildCompany = false) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const fields = getLeadImportFields(isChildCompany);
  const mapping = {};
  headers.forEach((header, index) => {
    const h = normalize(header);
    const match = fields.find((f) => {
      const label = normalize(f.label.replace(/\(.*\)/, ""));
      const key = normalize(f.key);
      return h === label || h === key || h.includes(label) || label.includes(h);
    });
    if (match) mapping[index] = match.key;
  });
  return mapping;
}

/** Applies the two new re-import-only behaviors (stage move, custom-field
 * values) — called after every createLead/updateLead in commitLeadImportChunk
 * below. A no-op for non-child companies and for rows that didn't map these
 * columns at all (record.stage/record[key] simply undefined). */
async function applyImportExtras(session, leadId, record, importedBy) {
  if (!session.is_child_company) return;
  if (record.stage) {
    const [[lead]] = await pool.query(`SELECT stage FROM leads WHERE id = ? AND company_id = ?`, [leadId, session.company_id]);
    if (lead && lead.stage !== record.stage) await updateLeadStage(session, leadId, record.stage, importedBy);
  }
  const mapped = Object.entries(CUSTOM_FIELD_IMPORT_KEYS).filter(([recordKey]) => record[recordKey]);
  if (mapped.length === 0) return;
  const fields = await listLeadCustomFields(session, { activeOnly: true });
  const byKey = new Map(fields.map((f) => [f.field_key, f]));
  const values = {};
  for (const [recordKey, fieldKey] of mapped) {
    const field = byKey.get(fieldKey);
    if (field) values[field.id] = record[recordKey];
  }
  if (Object.keys(values).length) await saveLeadCustomFieldValues(session, leadId, values, importedBy, { context: "lead_form" });
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
  const { timezone } = await getSettingsByGroup(session, "system");
  const seenPhones = new Map();
  const seenEmails = new Map();
  const companyStages = session.is_child_company ? await getLeadPipelineStages(session) : [];

  const results = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2;
    if (row.every((cell) => !cell || !String(cell).trim())) continue; // silently skip fully empty rows

    const record = rowToRecord(row, mapping);
    // Real server-side enforcement, not just UI hiding — note/followup/
    // stage/custom-field columns are a sub-company-only feature; strip them
    // before any further processing so even a stray/forged mapping can
    // never make a regular company's import touch any of this. leadId is
    // left alone — exact-ID matching is universal.
    if (!session.is_child_company) {
      delete record.noteContent; delete record.noteDate; delete record.followupType; delete record.followupDate;
      delete record.stage;
      for (const key of Object.keys(CUSTOM_FIELD_IMPORT_KEYS)) delete record[key];
    }
    const errors = [];

    if (record.stage && !companyStages.includes(record.stage)) {
      errors.push(`Stage "${record.stage}" doesn't match any of this company's configured stages: ${companyStages.join(", ")}.`);
    }

    // An explicit ID is authoritative and never second-guessed by the
    // phone/email heuristics below — either it resolves to a real record
    // in THIS company, or the row is an error (silently falling back to
    // "create new" would be a surprising way to handle a typo'd ID).
    let matchedById = null;
    if (record.leadId) {
      const [[m]] = await pool.query(`SELECT id, name FROM leads WHERE id = ? AND company_id = ? AND is_deleted = 0`, [record.leadId, session.company_id]);
      if (!m) errors.push(`Lead/Student ID "${record.leadId}" was not found.`);
      else matchedById = m;
    }

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
    // An ID match is authoritative — skip the phone/email heuristics
    // entirely (both the within-file tracking and the DB lookup) so an
    // explicit match is never second-guessed, and so multiple rows
    // sharing the same leadId each independently resolve to their own
    // "update" below, rather than only the first being recognized.
    if (matchedById) {
      duplicateOfId = matchedById.id;
    } else {
      if (record.phone && seenPhones.has(record.phone)) { isDuplicate = true; duplicateReason = `Duplicate phone within this file (row ${seenPhones.get(record.phone)}).`; }
      if (record.email && seenEmails.has(record.email)) { isDuplicate = true; duplicateReason = `Duplicate email within this file (row ${seenEmails.get(record.email)}).`; }
      if (record.phone) seenPhones.set(record.phone, rowNumber);
      if (record.email) seenEmails.set(record.email, rowNumber);

      if (!isDuplicate && errors.length === 0 && record.phone) {
        const existing = await findDuplicateLead(session.company_id, { phone: record.phone, email: record.email });
        if (existing) { isDuplicate = true; duplicateOfId = existing.id; duplicateReason = `Matches existing lead ${existing.name} (${existing.phone}).`; }
      }
    }

    // A note/follow-up date that doesn't parse only warns, never fails
    // the row — the lead itself is still good data; a note falls back to
    // "now" (addLeadNote's own default), a follow-up is simply skipped.
    const warnings = [];
    let noteCreatedAt = null;
    if (record.noteContent && record.noteDate) {
      noteCreatedAt = parseImportNoteDate(record.noteDate, timezone || "UTC");
      if (!noteCreatedAt) warnings.push(`Note date "${record.noteDate}" could not be parsed — the note will be saved with today's date instead.`);
    }
    let followupResolved = null;
    if (record.followupDate) {
      const scheduledAt = parseImportNoteDate(record.followupDate, timezone || "UTC");
      if (!scheduledAt) warnings.push(`Follow-up date "${record.followupDate}" could not be parsed — no follow-up was created for this row.`);
      else followupResolved = { type: FOLLOWUP_TYPES.includes(record.followupType) ? record.followupType : "Custom", scheduledAt };
    }

    results.push({
      rowNumber,
      raw: record,
      resolved: { leadSourceId, serviceId, assignedTo, priority, noteCreatedAt, followupResolved },
      duplicateOfId,
      errors,
      warnings,
      isDuplicate,
      duplicateReason,
      status: errors.length > 0 ? "invalid" : matchedById ? "update" : isDuplicate ? "duplicate" : "valid",
    });
  }

  return {
    total: results.length,
    valid: results.filter((r) => r.status === "valid").length,
    invalid: results.filter((r) => r.status === "invalid").length,
    duplicate: results.filter((r) => r.status === "duplicate").length,
    update: results.filter((r) => r.status === "update").length,
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
  // row.resolved.noteCreatedAt was a real Date when validateLeadImportRows
  // set it, but by the time it gets here it's round-tripped through JSON
  // twice (validate's response -> client state -> this call's request
  // body), arriving as an ISO string, not a Date instance. `new Date(...)`
  // reconstructs the exact same UTC instant from that string (and is a
  // harmless no-op if it's somehow already a Date) — addLeadNote expects
  // a real Date, same as every other datetime param in this pool.
  const toNoteDate = (value) => (value ? new Date(value) : undefined);
  let importedCount = 0, updatedCount = 0, skippedCount = 0, failedCount = 0;
  const errorReport = [];

  for (const row of rows) {
    if (row.status === "invalid") {
      failedCount++;
      errorReport.push({ row: row.rowNumber, name: row.raw.name, phone: row.raw.phone, reason: row.errors.join("; ") });
      continue;
    }
    // An exact ID match (row.status === "update") always updates —
    // independent of whatever duplicateStrategy was picked for the
    // separate, unrelated phone/email-heuristic duplicates below. This
    // is what lets several rows sharing the same leadId each add their
    // own note/follow-up to the one real record, regardless of strategy.
    if (row.status === "update") {
      try {
        await updateLead(session, row.duplicateOfId, {
          name: row.raw.name, email: row.raw.email || undefined, whatsapp: row.raw.whatsapp || undefined,
          country: row.raw.country || undefined, state: row.raw.state || undefined, city: row.raw.city || undefined,
          priority: row.resolved.priority, tags: row.raw.tags || undefined, remarks: row.raw.remarks || undefined,
        }, importedBy);
        if (row.resolved.assignedTo) await assignLead(session, row.duplicateOfId, row.resolved.assignedTo, importedBy);
        if (session.is_child_company && row.raw.noteContent) {
          await addLeadNote(session, row.duplicateOfId, { content: row.raw.noteContent, type: "general", createdAt: toNoteDate(row.resolved.noteCreatedAt) }, importedBy);
        }
        if (session.is_child_company && row.resolved.followupResolved) {
          await createFollowupFromImport(session, row.duplicateOfId, { type: row.resolved.followupResolved.type, scheduledAt: new Date(row.resolved.followupResolved.scheduledAt), notes: row.raw.noteContent || null }, importedBy);
        }
        await applyImportExtras(session, row.duplicateOfId, row.raw, importedBy);
        updatedCount++;
      } catch (err) {
        failedCount++;
        errorReport.push({ row: row.rowNumber, name: row.raw.name, phone: row.raw.phone, reason: err.message });
      }
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
          if (session.is_child_company && row.raw.noteContent) {
            await addLeadNote(session, row.duplicateOfId, { content: row.raw.noteContent, type: "general", createdAt: toNoteDate(row.resolved.noteCreatedAt) }, importedBy);
          }
          if (session.is_child_company && row.resolved.followupResolved) {
            await createFollowupFromImport(session, row.duplicateOfId, { type: row.resolved.followupResolved.type, scheduledAt: new Date(row.resolved.followupResolved.scheduledAt), notes: row.raw.noteContent || null }, importedBy);
          }
          await applyImportExtras(session, row.duplicateOfId, row.raw, importedBy);
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
      if (session.is_child_company && row.raw.noteContent) {
        await addLeadNote(session, leadId, { content: row.raw.noteContent, type: "general", createdAt: toNoteDate(row.resolved.noteCreatedAt) }, importedBy);
      }
      if (session.is_child_company && row.resolved.followupResolved) {
        await createFollowupFromImport(session, leadId, { type: row.resolved.followupResolved.type, scheduledAt: new Date(row.resolved.followupResolved.scheduledAt), notes: row.raw.noteContent || null }, importedBy);
      }
      await applyImportExtras(session, leadId, row.raw, importedBy);
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
    leadId: "", // blank = create new; fill in to update an exact existing record
    name: "John Doe", phone: "+91 9876543210", email: "john.doe@example.com", whatsapp: "+91 9876543210",
    country: "India", state: "Maharashtra", city: "Mumbai",
    leadSourceName: firstSourceName || "Website", serviceName: firstServiceName || "General Enquiry",
    assignedToName: "", priority: "Medium", tags: "hot,follow-up", remarks: "Sample row — delete before uploading",
    noteContent: "Called, interested, will confirm next week", noteDate: "2026-01-15 14:30",
    followupType: "Phone Call", followupDate: "2026-01-20 10:00",
  };
}
