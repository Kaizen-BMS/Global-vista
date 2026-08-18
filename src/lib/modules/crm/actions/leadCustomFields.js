import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";
import { uploadFile, getFileUrl, deleteFile } from "@/lib/services/StorageService";

const CUSTOM_FIELD_FILE_MAX_BYTES = 10 * 1024 * 1024;

const FIELD_TYPES = [
  "text", "textarea", "number", "date", "datetime", "select", "radio", "checkbox",
  "multiselect", "country", "state", "city", "address", "url", "email", "phone", "file",
];
const OPTION_TYPES = new Set(["select", "radio", "multiselect"]);

function slugifyKey(label) {
  return String(label).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 90) || "field";
}

function serializeField(row) {
  return { ...row, options: row.options_json ? JSON.parse(row.options_json) : [] };
}

/**
 * `context` narrows to only the fields a given surface should render —
 * Add Lead uses "lead_form", Lead Detail uses "lead_detail" (which also
 * includes fields not shown on the form but present on old data), Query
 * Forms use "query_form". Omit context to get the full admin list.
 */
export async function listLeadCustomFields(session, { activeOnly = false, context = null } = {}) {
  const contextColumn = { lead_form: "show_on_lead_form", lead_detail: "show_on_lead_detail", query_form: "show_on_query_form" }[context] || null;
  const [rows] = await pool.query(
    `SELECT * FROM lead_custom_fields WHERE company_id=? AND is_deleted=0
     ${activeOnly ? "AND status='active'" : ""} ${contextColumn ? `AND ${contextColumn}=1` : ""}
     ORDER BY display_order ASC, id ASC`,
    [session.company_id]
  );
  return rows.map(serializeField);
}

export async function getLeadCustomField(session, id) {
  const [[row]] = await pool.query(`SELECT * FROM lead_custom_fields WHERE id=? AND company_id=? AND is_deleted=0 LIMIT 1`, [id, session.company_id]);
  return row ? serializeField(row) : null;
}

function validateFieldPayload(data) {
  if (!data.label || !String(data.label).trim()) { const e = new Error("Field label is required."); e.status = 400; throw e; }
  if (!FIELD_TYPES.includes(data.fieldType)) { const e = new Error("Invalid field type."); e.status = 400; throw e; }
  if (OPTION_TYPES.has(data.fieldType)) {
    const opts = Array.isArray(data.options) ? data.options.filter((o) => o && String(o).trim()) : [];
    if (opts.length === 0) { const e = new Error(`${data.fieldType} fields need at least one option.`); e.status = 400; throw e; }
  }
}

export async function createLeadCustomField(session, data, actorId) {
  validateFieldPayload(data);
  const baseKey = data.fieldKey ? slugifyKey(data.fieldKey) : slugifyKey(data.label);
  let key = baseKey;
  for (let i = 2; i < 50; i++) {
    const [[dupe]] = await pool.query(`SELECT id FROM lead_custom_fields WHERE company_id=? AND field_key=?`, [session.company_id, key]);
    if (!dupe) break;
    key = `${baseKey}_${i}`;
  }

  const [[{ maxOrder }]] = await pool.query(`SELECT COALESCE(MAX(display_order), -1) AS maxOrder FROM lead_custom_fields WHERE company_id=? AND section=?`, [session.company_id, data.section || "Custom Information"]);

  const [result] = await pool.query(
    `INSERT INTO lead_custom_fields
     (company_id, section, field_key, label, help_text, placeholder, default_value, field_type, options_json,
      show_on_lead_form, show_on_lead_detail, show_on_query_form, is_required_on_lead_form, is_required_on_query_form,
      display_order, status, created_by, updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      session.company_id, data.section?.trim() || "Custom Information", key, data.label.trim(),
      data.helpText || null, data.placeholder || null, data.defaultValue || null, data.fieldType,
      OPTION_TYPES.has(data.fieldType) ? JSON.stringify(data.options.filter((o) => o && String(o).trim())) : null,
      data.showOnLeadForm !== false ? 1 : 0, data.showOnLeadDetail !== false ? 1 : 0, data.showOnQueryForm ? 1 : 0,
      data.isRequiredOnLeadForm ? 1 : 0, data.isRequiredOnQueryForm ? 1 : 0,
      maxOrder + 1, data.status || "active", actorId, actorId,
    ]
  );
  await logActivity({ userId: actorId, module: "leads", action: "custom_field_create", entityType: "lead_custom_field", entityId: result.insertId, companyId: session.company_id, description: `Created lead custom field "${data.label}"` });
  return result.insertId;
}

export async function updateLeadCustomField(session, id, data, actorId) {
  validateFieldPayload(data);
  const existing = await getLeadCustomField(session, id);
  if (!existing) { const e = new Error("Custom field not found."); e.status = 404; throw e; }

  await pool.query(
    `UPDATE lead_custom_fields SET
       section=?, label=?, help_text=?, placeholder=?, default_value=?, field_type=?, options_json=?,
       show_on_lead_form=?, show_on_lead_detail=?, show_on_query_form=?,
       is_required_on_lead_form=?, is_required_on_query_form=?, status=?, updated_by=?
     WHERE id=? AND company_id=? AND is_deleted=0`,
    [
      data.section?.trim() || "Custom Information", data.label.trim(), data.helpText || null, data.placeholder || null,
      data.defaultValue || null, data.fieldType,
      OPTION_TYPES.has(data.fieldType) ? JSON.stringify(data.options.filter((o) => o && String(o).trim())) : null,
      data.showOnLeadForm !== false ? 1 : 0, data.showOnLeadDetail !== false ? 1 : 0, data.showOnQueryForm ? 1 : 0,
      data.isRequiredOnLeadForm ? 1 : 0, data.isRequiredOnQueryForm ? 1 : 0,
      data.status || "active", actorId, id, session.company_id,
    ]
  );
  await logActivity({ userId: actorId, module: "leads", action: "custom_field_update", entityType: "lead_custom_field", entityId: id, companyId: session.company_id, description: `Updated lead custom field "${data.label}"` });
}

/**
 * Soft delete only — historical `lead_custom_field_values` for this field
 * must keep rendering on old leads (Lead Detail shows them regardless of
 * is_deleted), just never again on Add Lead/Edit Lead/Query Form.
 */
export async function deleteLeadCustomField(session, id, actorId) {
  const existing = await getLeadCustomField(session, id);
  if (!existing) { const e = new Error("Custom field not found."); e.status = 404; throw e; }
  await pool.query(`UPDATE lead_custom_fields SET is_deleted=1, status='inactive', updated_by=?, deleted_at=NOW(), deleted_by=? WHERE id=? AND company_id=?`, [actorId, actorId, id, session.company_id]);
  await logActivity({ userId: actorId, module: "leads", action: "custom_field_delete", entityType: "lead_custom_field", entityId: id, companyId: session.company_id, description: `Deleted lead custom field "${existing.label}"` });
}

export async function reorderLeadCustomFields(session, orderedIds, actorId) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.query(`UPDATE lead_custom_fields SET display_order=?, updated_by=? WHERE id=? AND company_id=?`, [i, actorId, orderedIds[i], session.company_id]);
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

/** "Sections" aren't a separate table — a rename is a bulk update of every field currently sharing that section name. */
export async function renameLeadCustomFieldSection(session, oldSection, newSection, actorId) {
  if (!newSection || !newSection.trim()) { const e = new Error("Section name is required."); e.status = 400; throw e; }
  await pool.query(`UPDATE lead_custom_fields SET section=?, updated_by=? WHERE company_id=? AND section=? AND is_deleted=0`, [newSection.trim(), actorId, session.company_id, oldSection]);
  await logActivity({ userId: actorId, module: "leads", action: "custom_field_section_rename", entityType: "lead_custom_field_section", entityId: null, companyId: session.company_id, description: `Renamed lead field section "${oldSection}" to "${newSection}"` });
}

/** Enable/disable every field in a section at once. */
export async function setLeadCustomFieldSectionStatus(session, section, status, actorId) {
  await pool.query(`UPDATE lead_custom_fields SET status=?, updated_by=? WHERE company_id=? AND section=? AND is_deleted=0`, [status, actorId, session.company_id, section]);
  await logActivity({ userId: actorId, module: "leads", action: "custom_field_section_status", entityType: "lead_custom_field_section", entityId: null, companyId: session.company_id, description: `Set lead field section "${section}" to ${status}` });
}

/** Reorders whole sections relative to each other, preserving each field's position within its own section. */
export async function reorderLeadCustomFieldSections(session, orderedSectionNames, actorId) {
  const fields = await listLeadCustomFields(session);
  const bySection = new Map();
  for (const f of fields) {
    if (!bySection.has(f.section)) bySection.set(f.section, []);
    bySection.get(f.section).push(f);
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let order = 0;
    for (const section of orderedSectionNames) {
      for (const field of bySection.get(section) || []) {
        await conn.query(`UPDATE lead_custom_fields SET display_order=?, updated_by=? WHERE id=? AND company_id=?`, [order++, actorId, field.id, session.company_id]);
      }
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

// ---------------------------------------------------------------------------
// Per-lead VALUES
// ---------------------------------------------------------------------------

async function assertLeadVisible(session, leadId) {
  // getVisibleLeadFilter's WHERE fragment is written against a `leads l`
  // alias (matches every other caller in leads.js) — this query must alias
  // the table the same way, or the `l.` prefix references a table that
  // doesn't exist in this query and MySQL throws ER_BAD_FIELD_ERROR.
  const { where, params } = await getVisibleLeadFilter(session);
  const [[lead]] = await pool.query(`SELECT l.id FROM leads l WHERE l.id=? AND l.company_id=? AND l.is_deleted=0 AND ${where} LIMIT 1`, [leadId, session.company_id, ...params]);
  if (!lead) { const e = new Error("Lead not found."); e.status = 404; throw e; }
  return lead;
}

/**
 * Returns every field with a value on this lead, INCLUDING inactive/soft-
 * deleted definitions (so historical data submitted while a field was
 * still active keeps displaying on Lead Detail — deleting a field must
 * never make past answers vanish).
 */
export async function getLeadCustomFieldValues(session, leadId) {
  await assertLeadVisible(session, leadId);
  const [rows] = await pool.query(
    `SELECT f.id AS field_id, f.section, f.label, f.field_type, f.options_json, f.status AS field_status, f.is_deleted AS field_deleted,
            f.display_order, v.value
     FROM lead_custom_field_values v
     JOIN lead_custom_fields f ON f.id = v.custom_field_id
     WHERE v.lead_id=? AND v.company_id=?
     ORDER BY f.display_order ASC, f.id ASC`,
    [leadId, session.company_id]
  );
  return rows.map((r) => ({ ...r, options: r.options_json ? JSON.parse(r.options_json) : [] }));
}

/**
 * `values` = { [customFieldId]: rawValue }. Only fields that are currently
 * active + company-owned are ever written — a stale/foreign/deleted field
 * id in the payload is silently skipped, never trusted. Required fields
 * (per the given context) are validated server-side, not just client-side.
 */
export async function saveLeadCustomFieldValues(session, leadId, values, actorId, { context = "lead_form" } = {}) {
  await assertLeadVisible(session, leadId);
  const fields = await listLeadCustomFields(session, { activeOnly: true });
  const fieldsById = new Map(fields.map((f) => [String(f.id), f]));
  const requiredColumn = context === "query_form" ? "is_required_on_query_form" : "is_required_on_lead_form";

  const missing = fields.filter((f) => f[requiredColumn] && !String(values?.[f.id] ?? "").trim());
  if (missing.length) { const e = new Error(`Missing required field(s): ${missing.map((f) => f.label).join(", ")}`); e.status = 400; throw e; }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [rawFieldId, rawValue] of Object.entries(values || {})) {
      const field = fieldsById.get(String(rawFieldId));
      if (!field) continue; // not this company's / not active — ignore silently, never trust the client
      const value = rawValue === undefined || rawValue === null ? "" : Array.isArray(rawValue) ? JSON.stringify(rawValue) : String(rawValue);
      if (!value.trim()) {
        await conn.query(`DELETE FROM lead_custom_field_values WHERE lead_id=? AND custom_field_id=? AND company_id=?`, [leadId, field.id, session.company_id]);
        continue;
      }
      await conn.query(
        `INSERT INTO lead_custom_field_values (company_id, lead_id, custom_field_id, value) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [session.company_id, leadId, field.id, value]
      );
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }

  await logActivity({ userId: actorId, module: "leads", action: "custom_fields_update", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Updated custom field values for lead #${leadId}` });
}

/**
 * Public-form variant — no session (the submitter is anonymous). Trusts
 * only companyId (resolved server-side from the form row, same pattern as
 * every other public submission field) and validates field_key against
 * that company's active, show_on_query_form fields only.
 */
/** Pre-flight check for the public submit handler — returns error strings (never throws) so they can join the same `errors` array as the name/phone/email checks, before any lead row is created. */
export async function validateQueryFormCustomFieldValues(companyId, valuesByKey) {
  const [fields] = await pool.query(
    `SELECT field_key, label FROM lead_custom_fields WHERE company_id=? AND is_deleted=0 AND status='active' AND show_on_query_form=1 AND is_required_on_query_form=1`,
    [companyId]
  );
  return fields.filter((f) => !String(valuesByKey?.[f.field_key] ?? "").trim()).map((f) => `${f.label} is required.`);
}

export async function saveLeadCustomFieldValuesPublic(companyId, leadId, valuesByKey) {
  if (!valuesByKey || Object.keys(valuesByKey).length === 0) return;
  const [fields] = await pool.query(
    `SELECT id, field_key, is_required_on_query_form FROM lead_custom_fields WHERE company_id=? AND is_deleted=0 AND status='active' AND show_on_query_form=1`,
    [companyId]
  );
  const byKey = new Map(fields.map((f) => [f.field_key, f]));

  const missing = fields.filter((f) => f.is_required_on_query_form && !String(valuesByKey[f.field_key] ?? "").trim());
  if (missing.length) { const e = new Error(`Missing required field(s): ${missing.map((f) => f.field_key).join(", ")}`); e.status = 400; throw e; }

  for (const [key, rawValue] of Object.entries(valuesByKey)) {
    const field = byKey.get(key);
    if (!field) continue;
    const value = Array.isArray(rawValue) ? JSON.stringify(rawValue) : String(rawValue ?? "");
    if (!value.trim()) continue;
    await pool.query(
      `INSERT INTO lead_custom_field_values (company_id, lead_id, custom_field_id, value) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [companyId, leadId, field.id, value]
    );
  }
}

// ---------------------------------------------------------------------------
// File-type field values — same StorageService as every other private
// upload in the app (lead documents, employee documents). The stored
// `value` for a file-type field is a small JSON envelope, not the raw
// key, so the renderer can show a file name without a second lookup.
// ---------------------------------------------------------------------------

async function assertOwnedActiveFileField(session, fieldId) {
  const [[field]] = await pool.query(`SELECT * FROM lead_custom_fields WHERE id=? AND company_id=? AND is_deleted=0 AND status='active' LIMIT 1`, [fieldId, session.company_id]);
  if (!field) { const e = new Error("Field not found."); e.status = 404; throw e; }
  if (field.field_type !== "file") { const e = new Error("This field does not accept file uploads."); e.status = 400; throw e; }
  return field;
}

export async function uploadLeadCustomFieldFile(session, leadId, fieldId, file, actorId) {
  await assertLeadVisible(session, leadId);
  await assertOwnedActiveFileField(session, fieldId);
  if (file.size > CUSTOM_FIELD_FILE_MAX_BYTES) { const e = new Error(`File exceeds ${CUSTOM_FIELD_FILE_MAX_BYTES / 1024 / 1024}MB limit.`); e.status = 400; throw e; }

  const [[existing]] = await pool.query(`SELECT value FROM lead_custom_field_values WHERE lead_id=? AND custom_field_id=? AND company_id=?`, [leadId, fieldId, session.company_id]);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await uploadFile({ companyId: session.company_id, category: "lead-custom-field-files", buffer, fileName: file.name, mimeType: file.type, maxSizeBytes: CUSTOM_FIELD_FILE_MAX_BYTES });
  const value = JSON.stringify({ key, fileName: file.name, size: file.size });

  await pool.query(
    `INSERT INTO lead_custom_field_values (company_id, lead_id, custom_field_id, value) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [session.company_id, leadId, fieldId, value]
  );

  if (existing?.value) {
    try { const old = JSON.parse(existing.value); if (old?.key) deleteFile(old.key).catch(() => {}); } catch { /* not a file-shaped value, nothing to clean up */ }
  }

  await logActivity({ userId: actorId, module: "leads", action: "custom_field_file_upload", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Uploaded "${file.name}" for custom field #${fieldId}` });
  return { fileName: file.name, size: file.size };
}

export async function getLeadCustomFieldFileUrl(session, leadId, fieldId) {
  await assertLeadVisible(session, leadId);
  const [[row]] = await pool.query(`SELECT value FROM lead_custom_field_values WHERE lead_id=? AND custom_field_id=? AND company_id=?`, [leadId, fieldId, session.company_id]);
  if (!row?.value) { const e = new Error("No file uploaded for this field."); e.status = 404; throw e; }
  let parsed;
  try { parsed = JSON.parse(row.value); } catch { const e = new Error("No file uploaded for this field."); e.status = 404; throw e; }
  if (!parsed?.key) { const e = new Error("No file uploaded for this field."); e.status = 404; throw e; }
  return { url: await getFileUrl(parsed.key), fileName: parsed.fileName };
}

export { FIELD_TYPES, OPTION_TYPES };
