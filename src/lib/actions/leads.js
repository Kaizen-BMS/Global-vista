import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { softDelete, paginate } from "@/lib/helpers/db";

export async function listLeads(session, { status = null, search = null, page = 1, pageSize = 20 } = {}) {
  const where = ["l.company_id=?", "l.is_deleted=0"]; const params = [session.company_id];
  if (status) { where.push("l.status=?"); params.push(status); }
  if (search) { where.push("(l.name LIKE ? OR l.phone LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset, page: p, pageSize: size } = paginate({ page, pageSize });
  const [rows] = await pool.query(`SELECT l.*, s.name AS source_name, sv.name AS service_name FROM leads l JOIN lead_sources s ON s.id=l.lead_source_id JOIN services sv ON sv.id=l.service_id ${whereSql} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l ${whereSql}`, params);
  return { leads: rows, total, page: p, pageSize: size };
}
export async function createLead(session, data, createdBy) {
  const [result] = await pool.query(`INSERT INTO leads (company_id, name, email, phone, lead_source_id, service_id, status, created_by, updated_by) VALUES (?,?,?,?,?,?,?,?,?)`, [session.company_id, data.name, data.email || null, data.phone, data.leadSourceId, data.serviceId, "New", createdBy, createdBy]);
  await logActivity({ userId: createdBy, module: "leads", action: "create", entityType: "lead", entityId: result.insertId, description: `Created lead ${data.name}`, companyId: session.company_id });
  return result.insertId;
}