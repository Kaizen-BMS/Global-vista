import "server-only";
import { pool } from "@/lib/db";

export async function logActivity({ userId = null, module, action, entityType = null, entityId = null, description = null, meta = null, ipAddress = null, companyId = null }) {
  await pool.query(
    `INSERT INTO activity_logs (user_id, module, action, entity_type, entity_id, description, meta, ip_address, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, module, action, entityType, entityId, description, meta ? JSON.stringify(meta) : null, ipAddress, companyId || 1]
  );
}
export async function getActivityLogs({ module = null, companyId = null, limit = 50, offset = 0 } = {}) {
  const where = []; const params = [];
  if (companyId) { where.push("al.company_id = ?"); params.push(companyId); }
  if (module) { where.push("al.module = ?"); params.push(module); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(limit, offset);
  const [rows] = await pool.query(`SELECT al.*, u.name AS user_name FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id ${whereSql} ORDER BY al.created_at DESC LIMIT ? OFFSET ?`, params);
  return rows;
}