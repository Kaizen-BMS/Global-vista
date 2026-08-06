import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { softDelete, NOT_DELETED } from "@/lib/helpers/db";

const TABLES = {
  branches: { table: "branches", extraCols: ["code", "address", "manager_id", "phone"] },
  departments: { table: "departments", extraCols: ["code"] },
  designations: { table: "designations", extraCols: ["department_id"] },
  "employee-types": { table: "employee_types", extraCols: [] },
};

export function resolveOrgTable(key) {
  const config = TABLES[key];
  if (!config) {
    const err = new Error("Unknown organization settings resource.");
    err.status = 400;
    throw err;
  }
  return config;
}

export async function listOrgRecords(key) {
  const { table } = resolveOrgTable(key);
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${NOT_DELETED} ORDER BY name ASC`);
  return rows;
}

export async function createOrgRecord(key, data, createdBy) {
  const { table, extraCols } = resolveOrgTable(key);
  const cols = ["name", ...extraCols.filter((c) => data[toCamel(c)] !== undefined)];
  const values = cols.map((c) => (c === "name" ? data.name : data[toCamel(c)] ?? null));
  const placeholders = cols.map(() => "?").join(", ");

  const [result] = await pool.query(
    `INSERT INTO ${table} (${cols.join(", ")}, created_by, updated_by) VALUES (${placeholders}, ?, ?)`,
    [...values, createdBy, createdBy]
  );

  await logActivity({
    userId: createdBy, module: "settings", action: "create", entityType: table,
    entityId: result.insertId, description: `Created ${table} entry: ${data.name}`,
  });

  return result.insertId;
}

export async function deleteOrgRecord(key, id, deletedBy) {
  const { table } = resolveOrgTable(key);
  await softDelete(table, id, deletedBy);
  await logActivity({
    userId: deletedBy, module: "settings", action: "delete", entityType: table,
    entityId: id, description: `Deleted ${table} entry #${id}`,
  });
}

function toCamel(snake) {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}