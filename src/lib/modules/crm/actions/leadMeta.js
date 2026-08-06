import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { softDelete, NOT_DELETED } from "@/lib/helpers/db";

export async function listLeadSources() {
  const [rows] = await pool.query(`SELECT * FROM lead_sources WHERE ${NOT_DELETED} ORDER BY name ASC`);
  return rows;
}

export async function createLeadSource({ name, slug, createdBy }) {
  const [result] = await pool.query(
    `INSERT INTO lead_sources (name, slug, created_by, updated_by) VALUES (?, ?, ?, ?)`,
    [name, slug, createdBy, createdBy]
  );
  await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "lead_source", entityId: result.insertId, description: `Created lead source ${name}` });
  return result.insertId;
}

export async function deleteLeadSource(id, deletedBy) {
  await softDelete("lead_sources", id, deletedBy);
  await logActivity({ userId: deletedBy, module: "settings", action: "delete", entityType: "lead_source", entityId: id, description: `Deleted lead source #${id}` });
}

export async function listServices() {
  const [rows] = await pool.query(`SELECT * FROM services WHERE ${NOT_DELETED} ORDER BY name ASC`);
  return rows;
}

export async function createService({ name, slug, createdBy }) {
  const [result] = await pool.query(
    `INSERT INTO services (name, slug, created_by, updated_by) VALUES (?, ?, ?, ?)`,
    [name, slug, createdBy, createdBy]
  );
  await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "service", entityId: result.insertId, description: `Created service ${name}` });
  return result.insertId;
}

export async function deleteService(id, deletedBy) {
  await softDelete("services", id, deletedBy);
  await logActivity({ userId: deletedBy, module: "settings", action: "delete", entityType: "service", entityId: id, description: `Deleted service #${id}` });
}