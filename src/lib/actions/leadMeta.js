import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { softDelete } from "@/lib/helpers/db";

export async function listLeadSources(session) { const [rows] = await pool.query(`SELECT * FROM lead_sources WHERE is_deleted=0 AND company_id=? ORDER BY name`, [session.company_id]); return rows; }
export async function createLeadSource(session, { name, slug, createdBy }) {
  const [result] = await pool.query(`INSERT INTO lead_sources (company_id, name, slug, created_by, updated_by) VALUES (?,?,?,?,?)`, [session.company_id, name, slug, createdBy, createdBy]);
  await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "lead_source", entityId: result.insertId, description: `Created source ${name}`, companyId: session.company_id });
  return result.insertId;
}
export async function deleteLeadSource(session, id, deletedBy) {
  await softDelete("lead_sources", id, deletedBy);
  await logActivity({ userId: deletedBy, module: "settings", action: "delete", entityType: "lead_source", entityId: id, description: `Deleted #${id}`, companyId: session.company_id });
}
export async function listServices(session) { const [rows] = await pool.query(`SELECT * FROM services WHERE is_deleted=0 AND company_id=? ORDER BY name`, [session.company_id]); return rows; }
export async function createService(session, { name, slug, createdBy }) {
  const [result] = await pool.query(`INSERT INTO services (company_id, name, slug, created_by, updated_by) VALUES (?,?,?,?,?)`, [session.company_id, name, slug, createdBy, createdBy]);
  await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "service", entityId: result.insertId, description: `Created service ${name}`, companyId: session.company_id });
  return result.insertId;
}
export async function deleteService(session, id, deletedBy) {
  await softDelete("services", id, deletedBy);
  await logActivity({ userId: deletedBy, module: "settings", action: "delete", entityType: "service", entityId: id, description: `Deleted #${id}`, companyId: session.company_id });
}