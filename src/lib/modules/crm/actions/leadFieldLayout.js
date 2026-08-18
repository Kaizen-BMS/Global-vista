import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { hasLeadFormBuilderSchema, hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import { BUILTIN_LEAD_FIELDS, BUILTIN_LEAD_FIELD_KEYS, CORE_REQUIRED_FIELD_KEYS, DEFAULT_SECTIONS } from "@/lib/modules/crm/constants/builtinLeadFields";
import { listLeadCustomFields, getLeadCustomFieldValues, renameLeadCustomFieldSection, setLeadCustomFieldSectionStatus } from "@/lib/modules/crm/actions/leadCustomFields";

const FRIENDLY_COLUMN = { leadSourceId: "source_name", serviceId: "service_name", assignedTo: "assigned_name" };

const REGISTRY_BY_KEY = new Map(BUILTIN_LEAD_FIELDS.map((f) => [f.key, f]));

function notReadyError() {
  const e = new Error("The Lead Form Builder isn't available yet — a pending database migration must be applied first.");
  e.status = 503;
  throw e;
}

// ---------------------------------------------------------------------------
// SECTIONS
// ---------------------------------------------------------------------------

/** Idempotent — only inserts the system default sections the first time a
 * company touches the builder, so a brand-new company sees the current
 * default form immediately, but a company that already customized its
 * sections is never silently reset by a later change to DEFAULT_SECTIONS. */
export async function ensureDefaultSections(session, actorId) {
  if (!(await hasLeadFormBuilderSchema())) return;
  const [[{ count }]] = await pool.query(`SELECT COUNT(*) AS count FROM lead_field_sections WHERE company_id=? AND is_deleted=0`, [session.company_id]);
  if (count > 0) return;
  for (let i = 0; i < DEFAULT_SECTIONS.length; i++) {
    const s = DEFAULT_SECTIONS[i];
    await pool.query(
      `INSERT INTO lead_field_sections (company_id, name, description, display_order, created_by, updated_by) VALUES (?,?,?,?,?,?)`,
      [session.company_id, s.name, s.description, i, actorId, actorId]
    );
  }
}

export async function listFieldSections(session, { activeOnly = false } = {}) {
  if (!(await hasLeadFormBuilderSchema())) return [];
  const [rows] = await pool.query(
    `SELECT * FROM lead_field_sections WHERE company_id=? AND is_deleted=0 ${activeOnly ? "AND status='active'" : ""} ORDER BY display_order ASC, id ASC`,
    [session.company_id]
  );
  return rows;
}

async function getOwnedSection(session, id) {
  const [[row]] = await pool.query(`SELECT * FROM lead_field_sections WHERE id=? AND company_id=? AND is_deleted=0`, [id, session.company_id]);
  if (!row) { const e = new Error("Section not found."); e.status = 404; throw e; }
  return row;
}

export async function createFieldSection(session, { name, description }, actorId) {
  if (!(await hasLeadFormBuilderSchema())) notReadyError();
  if (!name || !name.trim()) { const e = new Error("Section name is required."); e.status = 400; throw e; }
  const [[{ maxOrder }]] = await pool.query(`SELECT COALESCE(MAX(display_order), -1) AS maxOrder FROM lead_field_sections WHERE company_id=?`, [session.company_id]);
  const [result] = await pool.query(
    `INSERT INTO lead_field_sections (company_id, name, description, display_order, created_by, updated_by) VALUES (?,?,?,?,?,?)`,
    [session.company_id, name.trim(), description?.trim() || null, maxOrder + 1, actorId, actorId]
  );
  await logActivity({ userId: actorId, module: "leads", action: "field_section_create", entityType: "lead_field_section", entityId: result.insertId, companyId: session.company_id, description: `Created lead form section "${name.trim()}"` });
  return result.insertId;
}

/** Renaming cascades into `lead_custom_fields.section` (the legacy free-text
 * column) so a custom field created before/after this table existed always
 * groups under the section's current name — the exact bridge that lets both
 * tables share one section identity without altering lead_custom_fields'
 * schema. */
export async function updateFieldSection(session, id, { name, description }, actorId) {
  if (!(await hasLeadFormBuilderSchema())) notReadyError();
  const existing = await getOwnedSection(session, id);
  if (!name || !name.trim()) { const e = new Error("Section name is required."); e.status = 400; throw e; }
  const newName = name.trim();

  await pool.query(`UPDATE lead_field_sections SET name=?, description=?, updated_by=? WHERE id=? AND company_id=?`, [newName, description?.trim() || null, actorId, id, session.company_id]);

  if (newName !== existing.name && (await hasLeadCustomFieldsSchema())) {
    await renameLeadCustomFieldSection(session, existing.name, newName, actorId);
  }
  await logActivity({ userId: actorId, module: "leads", action: "field_section_update", entityType: "lead_field_section", entityId: id, companyId: session.company_id, description: `Renamed lead form section "${existing.name}" to "${newName}"` });
}

/** Disabling a section also disables every field inside it (built-in
 * configs + custom fields), mirroring the exact behavior
 * setLeadCustomFieldSectionStatus already had before this table existed —
 * a hidden section can never leave individually-still-visible fields
 * floating with nowhere to render. */
export async function setFieldSectionStatus(session, id, status, actorId) {
  if (!(await hasLeadFormBuilderSchema())) notReadyError();
  if (!["active", "inactive"].includes(status)) { const e = new Error("Invalid status."); e.status = 400; throw e; }
  const existing = await getOwnedSection(session, id);

  await pool.query(`UPDATE lead_field_sections SET status=?, updated_by=? WHERE id=? AND company_id=?`, [status, actorId, id, session.company_id]);
  await pool.query(`UPDATE lead_field_layout SET show_on_lead_form=?, updated_by=? WHERE section_id=? AND company_id=?`, [status === "active" ? 1 : 0, actorId, id, session.company_id]);
  if (await hasLeadCustomFieldsSchema()) {
    await setLeadCustomFieldSectionStatus(session, existing.name, status, actorId);
  }
  await logActivity({ userId: actorId, module: "leads", action: "field_section_status", entityType: "lead_field_section", entityId: id, companyId: session.company_id, description: `Set lead form section "${existing.name}" to ${status}` });
}

export async function reorderFieldSections(session, orderedIds, actorId) {
  if (!(await hasLeadFormBuilderSchema())) notReadyError();
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.query(`UPDATE lead_field_sections SET display_order=?, updated_by=? WHERE id=? AND company_id=?`, [i, actorId, orderedIds[i], session.company_id]);
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

/** Refuses (rather than silently reassigning) if any field still points at
 * this section — the admin must move or remove those fields first. This is
 * the one place a delete can be "blocked" instead of soft-deleted, and it's
 * blocked precisely so no field's configuration silently loses its home. */
export async function deleteFieldSection(session, id, actorId) {
  if (!(await hasLeadFormBuilderSchema())) notReadyError();
  const existing = await getOwnedSection(session, id);
  const [[{ builtinCount }]] = await pool.query(`SELECT COUNT(*) AS builtinCount FROM lead_field_layout WHERE section_id=? AND company_id=?`, [id, session.company_id]);
  let customCount = 0;
  if (await hasLeadCustomFieldsSchema()) {
    const [[row]] = await pool.query(`SELECT COUNT(*) AS n FROM lead_custom_fields WHERE company_id=? AND section=? AND is_deleted=0`, [session.company_id, existing.name]);
    customCount = row.n;
  }
  if (builtinCount > 0 || customCount > 0) {
    const e = new Error(`This section still has ${builtinCount + customCount} field(s) in it. Move or remove them first.`);
    e.status = 400;
    throw e;
  }
  await pool.query(`UPDATE lead_field_sections SET is_deleted=1, updated_by=?, deleted_at=NOW(), deleted_by=? WHERE id=? AND company_id=?`, [actorId, actorId, id, session.company_id]);
  await logActivity({ userId: actorId, module: "leads", action: "field_section_delete", entityType: "lead_field_section", entityId: id, companyId: session.company_id, description: `Deleted lead form section "${existing.name}"` });
}

// ---------------------------------------------------------------------------
// BUILT-IN FIELD CONFIG
// ---------------------------------------------------------------------------

/** Merges one registry entry with its company override row (if any) — a
 * built-in field with no override renders exactly as it does today. */
function resolveBuiltinField(def, override, sectionById, sectionByName) {
  const o = override;
  const section = o?.section_id ? sectionById.get(o.section_id) : sectionByName.get(def.section);
  return {
    key: def.key, column: def.column, inputType: def.inputType, options: def.options || null,
    coreRequired: !!def.coreRequired, isCustom: false,
    label: o?.label || def.label,
    helpText: o?.help_text ?? null,
    placeholder: o?.placeholder ?? null,
    sectionId: section?.id ?? null,
    section: section?.name ?? def.section,
    showOnLeadForm: o ? !!o.show_on_lead_form : true,
    showOnLeadDetail: o ? !!o.show_on_lead_detail : true,
    showOnQueryForm: o ? !!o.show_on_query_form : false,
    isRequiredOnLeadForm: o ? !!o.is_required_on_lead_form : !!def.coreRequired,
    isRequiredOnQueryForm: o ? !!o.is_required_on_query_form : false,
    displayOrder: o?.display_order ?? def.order,
  };
}

/** Always returns every registry field, including disabled ones, since this
 * is the admin-facing shape; callers filtering for a rendering surface
 * (Add Lead, Lead Detail, Query Form) apply their own context filter after. */
export async function getBuiltinFieldConfig(session) {
  const sections = await listFieldSections(session);
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const sectionByName = new Map(sections.map((s) => [s.name, s]));

  let overrides = new Map();
  if (await hasLeadFormBuilderSchema()) {
    const [rows] = await pool.query(`SELECT * FROM lead_field_layout WHERE company_id=?`, [session.company_id]);
    overrides = new Map(rows.map((r) => [r.field_key, r]));
  }

  return BUILTIN_LEAD_FIELDS.map((def) => resolveBuiltinField(def, overrides.get(def.key), sectionById, sectionByName));
}

/**
 * A genuine PARTIAL update — merges `patch` over this field's current
 * effective config (existing override row, or the registry default if none
 * exists yet), so a caller can send just `{ sectionId }` to move a field
 * without accidentally blanking its label/required/visibility state. This
 * is what lets quick actions (move, toggle visible, toggle required) stay
 * one small request instead of round-tripping the full field first.
 *
 * Core-required fields (name/phone/leadSourceId/serviceId) can never be
 * hidden from Add Lead or made optional there — the physical column is
 * NOT NULL, so violating this would fail at the database with a confusing
 * error instead of a clear one here.
 */
export async function upsertBuiltinFieldConfig(session, fieldKey, patch, actorId) {
  if (!(await hasLeadFormBuilderSchema())) notReadyError();
  if (!BUILTIN_LEAD_FIELD_KEYS.has(fieldKey)) { const e = new Error("Unknown built-in field."); e.status = 400; throw e; }
  const def = REGISTRY_BY_KEY.get(fieldKey);

  const sections = await listFieldSections(session);
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const sectionByName = new Map(sections.map((s) => [s.name, s]));
  const [[existingRow]] = await pool.query(`SELECT * FROM lead_field_layout WHERE company_id=? AND field_key=?`, [session.company_id, fieldKey]);
  const current = resolveBuiltinField(def, existingRow, sectionById, sectionByName);

  const merged = {
    sectionId: patch.sectionId !== undefined ? patch.sectionId : current.sectionId,
    label: patch.label !== undefined ? patch.label : current.label,
    helpText: patch.helpText !== undefined ? patch.helpText : current.helpText,
    placeholder: patch.placeholder !== undefined ? patch.placeholder : current.placeholder,
    showOnLeadForm: patch.showOnLeadForm !== undefined ? !!patch.showOnLeadForm : current.showOnLeadForm,
    showOnLeadDetail: patch.showOnLeadDetail !== undefined ? !!patch.showOnLeadDetail : current.showOnLeadDetail,
    showOnQueryForm: patch.showOnQueryForm !== undefined ? !!patch.showOnQueryForm : current.showOnQueryForm,
    isRequiredOnLeadForm: patch.isRequiredOnLeadForm !== undefined ? !!patch.isRequiredOnLeadForm : current.isRequiredOnLeadForm,
    isRequiredOnQueryForm: patch.isRequiredOnQueryForm !== undefined ? !!patch.isRequiredOnQueryForm : current.isRequiredOnQueryForm,
  };

  if (CORE_REQUIRED_FIELD_KEYS.has(fieldKey) && (!merged.showOnLeadForm || !merged.isRequiredOnLeadForm)) {
    const e = new Error(`"${def.label}" is required by the database and can't be hidden or made optional on Add Lead.`);
    e.status = 400;
    throw e;
  }
  if (merged.sectionId) {
    const [[section]] = await pool.query(`SELECT id FROM lead_field_sections WHERE id=? AND company_id=? AND is_deleted=0`, [merged.sectionId, session.company_id]);
    if (!section) { const e = new Error("Section not found."); e.status = 400; throw e; }
  }

  const [[{ maxOrder }]] = await pool.query(
    `SELECT COALESCE(MAX(display_order), -1) AS maxOrder FROM lead_field_layout WHERE company_id=? AND section_id <=> ?`,
    [session.company_id, merged.sectionId || null]
  );
  const displayOrder = existingRow && existingRow.section_id === (merged.sectionId || null) ? existingRow.display_order : maxOrder + 1;

  await pool.query(
    `INSERT INTO lead_field_layout
       (company_id, field_key, section_id, label, help_text, placeholder, show_on_lead_form, show_on_lead_detail,
        show_on_query_form, is_required_on_lead_form, is_required_on_query_form, display_order, created_by, updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       section_id=VALUES(section_id), label=VALUES(label), help_text=VALUES(help_text), placeholder=VALUES(placeholder),
       show_on_lead_form=VALUES(show_on_lead_form), show_on_lead_detail=VALUES(show_on_lead_detail),
       show_on_query_form=VALUES(show_on_query_form), is_required_on_lead_form=VALUES(is_required_on_lead_form),
       is_required_on_query_form=VALUES(is_required_on_query_form), display_order=VALUES(display_order), updated_by=VALUES(updated_by)`,
    [
      session.company_id, fieldKey, merged.sectionId || null,
      merged.label && merged.label !== def.label ? merged.label.trim() : null,
      merged.helpText?.trim() || null, merged.placeholder?.trim() || null,
      merged.showOnLeadForm ? 1 : 0, merged.showOnLeadDetail ? 1 : 0, merged.showOnQueryForm ? 1 : 0,
      merged.isRequiredOnLeadForm ? 1 : 0, merged.isRequiredOnQueryForm ? 1 : 0,
      displayOrder, actorId, actorId,
    ]
  );
  await logActivity({ userId: actorId, module: "leads", action: "field_layout_update", entityType: "lead_field_layout", entityId: null, companyId: session.company_id, description: `Updated built-in field configuration for "${def.label}"` });
}

/** Persists a single drag/reorder — accepts an interleaved list of built-in
 * and custom field references so one section can mix both types in one
 * ordered list, each type writing to its own table's display_order. */
export async function reorderSectionFields(session, sectionName, orderedRefs, actorId) {
  if (!Array.isArray(orderedRefs)) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedRefs.length; i++) {
      const ref = orderedRefs[i];
      if (ref.isCustom) {
        await conn.query(`UPDATE lead_custom_fields SET display_order=?, updated_by=? WHERE id=? AND company_id=? AND section=?`, [i, actorId, ref.id, session.company_id, sectionName]);
      } else {
        if (!BUILTIN_LEAD_FIELD_KEYS.has(ref.key)) continue;
        const [[section]] = await pool.query(`SELECT id FROM lead_field_sections WHERE company_id=? AND name=? AND is_deleted=0`, [session.company_id, sectionName]);
        await conn.query(
          `INSERT INTO lead_field_layout (company_id, field_key, section_id, display_order, created_by, updated_by) VALUES (?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE display_order=VALUES(display_order), updated_by=VALUES(updated_by)`,
          [session.company_id, ref.key, section?.id || null, i, actorId, actorId]
        );
      }
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

// ---------------------------------------------------------------------------
// UNIFIED LAYOUT — what every rendering surface actually consumes
// ---------------------------------------------------------------------------

const CONTEXT_SHOW_KEY = { lead_form: "showOnLeadForm", lead_detail: "showOnLeadDetail", query_form: "showOnQueryForm" };
const CONTEXT_REQUIRED_KEY = { lead_form: "isRequiredOnLeadForm", query_form: "isRequiredOnQueryForm" };

/**
 * Returns `[{ section: {id,name,description,status}, fields: [...] }]`,
 * built-in and custom fields merged and sorted together by displayOrder
 * within each section. `context` narrows to a rendering surface the same
 * way listLeadCustomFields' context param already does; omit it for the
 * full admin builder view (every field, every section, active or not).
 *
 * Sections a field still references but that no longer exist as a current
 * `lead_field_sections` row (legacy custom-field section strings from
 * before this table existed) are appended at the end as their own group,
 * so nothing a company already configured silently disappears.
 */
export async function getFullLeadFormLayout(session, { context = null } = {}) {
  const sections = await listFieldSections(session, { activeOnly: context != null });
  const builtins = await getBuiltinFieldConfig(session);
  const customs = (await hasLeadCustomFieldsSchema())
    ? (await listLeadCustomFields(session, { activeOnly: context != null, context })).map((f) => ({
        key: `custom:${f.id}`, id: f.id, isCustom: true, label: f.label, helpText: f.help_text, placeholder: f.placeholder,
        defaultValue: f.default_value, inputType: f.field_type, options: f.options, section: f.section,
        showOnLeadForm: !!f.show_on_lead_form, showOnLeadDetail: !!f.show_on_lead_detail, showOnQueryForm: !!f.show_on_query_form,
        isRequiredOnLeadForm: !!f.is_required_on_lead_form, isRequiredOnQueryForm: !!f.is_required_on_query_form,
        displayOrder: f.display_order, status: f.status,
      }))
    : [];

  const showKey = context ? CONTEXT_SHOW_KEY[context] : null;
  const requiredKey = context ? CONTEXT_REQUIRED_KEY[context] : null;
  let allFields = [...builtins.map((f) => ({ ...f, isCustom: false })), ...customs];
  if (showKey) allFields = allFields.filter((f) => f[showKey]);
  if (requiredKey) allFields = allFields.map((f) => ({ ...f, required: !!f[requiredKey] }));

  const bySection = new Map();
  const order = [];
  for (const s of sections) { bySection.set(s.name, { section: s, fields: [] }); order.push(s.name); }
  for (const f of allFields) {
    if (!bySection.has(f.section)) { bySection.set(f.section, { section: { id: null, name: f.section, description: null, status: "active" }, fields: [] }); order.push(f.section); }
    bySection.get(f.section).fields.push(f);
  }
  for (const name of order) bySection.get(name).fields.sort((a, b) => a.displayOrder - b.displayOrder);

  return order.map((name) => bySection.get(name)).filter((g) => context == null || g.fields.length > 0);
}

/** Deletes only this company's built-in overrides and section structure —
 * `lead_custom_fields` / `lead_custom_field_values` are never touched, so no
 * lead ever loses a value and no custom field a company invented disappears.
 * Sections are rebuilt from DEFAULT_SECTIONS immediately after. */
export async function resetFieldLayoutToDefault(session, actorId) {
  if (!(await hasLeadFormBuilderSchema())) notReadyError();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM lead_field_layout WHERE company_id=?`, [session.company_id]);
    await conn.query(`UPDATE lead_field_sections SET is_deleted=1, deleted_at=NOW(), deleted_by=? WHERE company_id=?`, [actorId, session.company_id]);
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
  await ensureDefaultSections(session, actorId);
  await logActivity({ userId: actorId, module: "leads", action: "field_layout_reset", entityType: "lead_field_section", entityId: null, companyId: session.company_id, description: `Reset lead form configuration to system default` });
}

/**
 * Lead Detail's section-grouped value view — built-in field VALUES come
 * straight off the already-fetched `lead` row (no extra query), using the
 * friendly joined name for the three FK fields (Lead Source, Service,
 * Assign To) instead of a raw id. Custom field values are sourced from
 * getLeadCustomFieldValues directly (NOT from getFullLeadFormLayout's
 * active-only list) specifically so a value saved while a custom field was
 * still active keeps rendering here after that field is later disabled or
 * deleted — the same historical-data guarantee LeadCustomFieldsDisplay
 * already had, just now interleaved with built-in fields in one grouped
 * view instead of two separate ones. Fields with no value are omitted,
 * matching the pre-existing custom-fields-only display's behavior.
 */
export async function getLeadDetailFieldGroups(session, lead) {
  const sections = await listFieldSections(session);
  const builtins = await getBuiltinFieldConfig(session);

  const builtinValued = builtins
    .filter((f) => f.showOnLeadDetail)
    .map((f) => {
      const friendlyCol = FRIENDLY_COLUMN[f.key];
      const raw = friendlyCol ? lead[friendlyCol] : lead[f.column];
      const value = raw instanceof Date ? raw.toISOString().slice(0, 10) : raw;
      return { ...f, isCustom: false, value };
    })
    .filter((f) => f.value !== null && f.value !== undefined && String(f.value).trim() !== "");

  const customValues = (await hasLeadCustomFieldsSchema()) ? await getLeadCustomFieldValues(session, lead.id) : [];
  const customValued = customValues.map((v) => ({
    key: `custom:${v.field_id}`, id: v.field_id, isCustom: true, label: v.label, inputType: v.field_type,
    options: v.options, section: v.section, value: v.value, displayOrder: v.display_order,
    noLongerConfigured: !!v.field_deleted || v.field_status === "inactive",
  }));

  const bySection = new Map();
  const order = [];
  for (const s of sections) { bySection.set(s.name, { section: s, fields: [] }); order.push(s.name); }
  for (const f of [...builtinValued, ...customValued]) {
    if (!bySection.has(f.section)) { bySection.set(f.section, { section: { id: null, name: f.section, description: null, status: "active" }, fields: [] }); order.push(f.section); }
    bySection.get(f.section).fields.push(f);
  }
  for (const name of order) bySection.get(name).fields.sort((a, b) => a.displayOrder - b.displayOrder);

  return order.map((name) => bySection.get(name)).filter((g) => g.fields.length > 0);
}
