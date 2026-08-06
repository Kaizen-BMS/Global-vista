import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { softDelete } from "@/lib/helpers/db";

/**
 * Confirmed against live schema (information_schema.COLUMNS):
 *
 *   branches       — has company_id, has code   → scope: 'company'
 *   departments    — has company_id, has code   → scope: 'company'
 *   designations   — NO company_id, has department_id, NO code
 *                    → scope: 'department' (tenant boundary enforced
 *                      transitively through departments.company_id)
 *   employee_types — NO company_id, NO code     → scope: 'global'
 *                    (shared master data across every tenant, same
 *                    pattern as countries/states/cities)
 *
 * `employee_categories` does not exist as a table in this schema at
 * all — it was never referenced in this file's TABLES map, so no fix
 * was needed here for it; if it's referenced elsewhere in the
 * codebase, that's a separate bug outside this file's scope.
 */
const RESOURCE_CONFIG = {
  branches: { table: "branches", scope: "company", hasCode: true },
  departments: { table: "departments", scope: "company", hasCode: true },
  designations: { table: "designations", scope: "department", hasCode: false },
  "employee-types": { table: "employee_types", scope: "global", hasCode: false },
};

function resolveResource(key) {
  const config = RESOURCE_CONFIG[key];
  if (!config) {
    const e = new Error("Unknown resource.");
    e.status = 400;
    throw e;
  }
  return config;
}

export async function listOrgRecords(session, key) {
  const { table, scope } = resolveResource(key);

  if (scope === "company") {
    const [rows] = await pool.query(
      `SELECT * FROM ${table} WHERE is_deleted=0 AND company_id=? ORDER BY name`,
      [session.company_id]
    );
    return rows;
  }

  if (scope === "global") {
    // No company_id column exists on this table by design — every
    // tenant sees the same shared rows. Never add a company_id filter
    // here; the column does not exist and the query would fail exactly
    // as the original bug report showed.
    const [rows] = await pool.query(
      `SELECT * FROM ${table} WHERE is_deleted=0 ORDER BY name`
    );
    return rows;
  }

  if (scope === "department") {
    // designations has no company_id of its own — tenant boundary is
    // enforced by joining through department_id to departments.company_id.
    const [rows] = await pool.query(
      `SELECT d.* FROM designations d
       JOIN departments dept ON dept.id = d.department_id
       WHERE d.is_deleted=0 AND dept.is_deleted=0 AND dept.company_id=?
       ORDER BY d.name`,
      [session.company_id]
    );
    return rows;
  }

  // Unreachable given RESOURCE_CONFIG's fixed scope values, but fails
  // loudly rather than silently returning nothing if a new scope value
  // is ever added without updating this function.
  const e = new Error(`Unhandled resource scope for "${key}".`);
  e.status = 500;
  throw e;
}

export async function createOrgRecord(session, key, data, createdBy) {
  const { table, scope, hasCode } = resolveResource(key);

  if (scope === "company") {
    const cols = ["company_id", "name"];
    const vals = [session.company_id, data.name];
    if (hasCode && data.code) {
      cols.push("code");
      vals.push(data.code);
    }
    const [result] = await pool.query(
      `INSERT INTO ${table} (${cols.join(",")}, created_by, updated_by) VALUES (${cols.map(() => "?").join(",")}, ?, ?)`,
      [...vals, createdBy, createdBy]
    );
    await logActivity({
      userId: createdBy, module: "settings", action: "create", entityType: table,
      entityId: result.insertId, description: `Created ${table} ${data.name}`, companyId: session.company_id,
    });
    return result.insertId;
  }

  if (scope === "global") {
    // No company_id column — insert never includes it.
    const cols = ["name"];
    const vals = [data.name];
    if (hasCode && data.code) {
      cols.push("code");
      vals.push(data.code);
    }
    const [result] = await pool.query(
      `INSERT INTO ${table} (${cols.join(",")}, created_by, updated_by) VALUES (${cols.map(() => "?").join(",")}, ?, ?)`,
      [...vals, createdBy, createdBy]
    );
    // companyId is still passed to logActivity purely for the audit
    // trail (who, from which company, created this shared record) —
    // it is not a filter and not written to the resource table itself.
    await logActivity({
      userId: createdBy, module: "settings", action: "create", entityType: table,
      entityId: result.insertId, description: `Created ${table} ${data.name}`, companyId: session.company_id,
    });
    return result.insertId;
  }

  if (scope === "department") {
    if (!data.departmentId) {
      const e = new Error("departmentId is required to create a designation.");
      e.status = 400;
      throw e;
    }

    // Tenant isolation check: the supplied departmentId must actually
    // belong to the caller's own company before a designation can be
    // attached to it — otherwise a guessed/stale department id from
    // another company could let this company create a designation
    // under a department it doesn't own.
    const [[department]] = await pool.query(
      `SELECT id FROM departments WHERE id=? AND company_id=? AND is_deleted=0 LIMIT 1`,
      [data.departmentId, session.company_id]
    );
    if (!department) {
      const e = new Error("Department not found in this company.");
      e.status = 404;
      throw e;
    }

    const [result] = await pool.query(
      `INSERT INTO designations (department_id, name, created_by, updated_by) VALUES (?, ?, ?, ?)`,
      [data.departmentId, data.name, createdBy, createdBy]
    );
    await logActivity({
      userId: createdBy, module: "settings", action: "create", entityType: "designations",
      entityId: result.insertId, description: `Created designation ${data.name}`, companyId: session.company_id,
    });
    return result.insertId;
  }

  const e = new Error(`Unhandled resource scope for "${key}".`);
  e.status = 500;
  throw e;
}

export async function deleteOrgRecord(session, key, id, deletedBy) {
  const { table, scope } = resolveResource(key);

  if (scope === "company") {
    // Ownership check before delete — softDelete() itself only filters
    // by id, so this guards against deleting another company's row via
    // a stale or guessed id.
    const [[record]] = await pool.query(
      `SELECT id FROM ${table} WHERE id=? AND company_id=? AND is_deleted=0 LIMIT 1`,
      [id, session.company_id]
    );
    if (!record) {
      const e = new Error("Record not found in this company.");
      e.status = 404;
      throw e;
    }
  } else if (scope === "department") {
    // Same ownership guard, enforced transitively through the parent
    // department's company_id, since designations has no company_id
    // column of its own.
    const [[record]] = await pool.query(
      `SELECT d.id FROM designations d
       JOIN departments dept ON dept.id = d.department_id
       WHERE d.id=? AND dept.company_id=? AND d.is_deleted=0 LIMIT 1`,
      [id, session.company_id]
    );
    if (!record) {
      const e = new Error("Designation not found in this company.");
      e.status = 404;
      throw e;
    }
  }
  // scope === "global": no ownership check — the record is shared
  // across every tenant by design, so any authenticated caller with
  // the appropriate permission (checked at the API-route layer, not
  // here) may delete it.

  await softDelete(table, id, deletedBy);
  await logActivity({
    userId: deletedBy, module: "settings", action: "delete", entityType: table,
    entityId: id, description: `Deleted ${table} #${id}`, companyId: session.company_id,
  });
}