import "server-only";
import { pool } from "@/lib/db";
import { NOT_DELETED } from "@/lib/helpers/db";

export async function getDashboardStats() {
  const [[leadCount]] = await pool.query(`SELECT COUNT(*) AS total FROM leads WHERE ${NOT_DELETED}`);
  const [[newLeads]] = await pool.query(`SELECT COUNT(*) AS total FROM leads WHERE status='New' AND ${NOT_DELETED}`);
  const [[converted]] = await pool.query(`SELECT COUNT(*) AS total FROM leads WHERE status='Converted' AND ${NOT_DELETED}`);
  const [[userCount]] = await pool.query(`SELECT COUNT(*) AS total FROM users WHERE status='active' AND ${NOT_DELETED}`);
  return {
    totalLeads: leadCount.total,
    newLeads: newLeads.total,
    converted: converted.total,
    activeUsers: userCount.total,
  };
}

export async function getLeadsBySource() {
  const [rows] = await pool.query(
    `SELECT s.name AS source, COUNT(l.id) AS count
     FROM lead_sources s
     LEFT JOIN leads l ON l.lead_source_id = s.id AND l.${NOT_DELETED}
     WHERE s.${NOT_DELETED}
     GROUP BY s.id ORDER BY count DESC`
  );
  return rows;
}

export async function getLeadsByService() {
  const [rows] = await pool.query(
    `SELECT sv.name AS service, COUNT(l.id) AS count
     FROM services sv
     LEFT JOIN leads l ON l.service_id = sv.id AND l.${NOT_DELETED}
     WHERE sv.${NOT_DELETED}
     GROUP BY sv.id ORDER BY count DESC`
  );
  return rows;
}

export async function getRecentLeads(limit = 6) {
  const [rows] = await pool.query(
    `SELECT l.id, l.name, l.status, s.name AS source_name, sv.name AS service_name
     FROM leads l
     JOIN lead_sources s ON s.id = l.lead_source_id
     JOIN services sv ON sv.id = l.service_id
     WHERE l.${NOT_DELETED}
     ORDER BY l.created_at DESC LIMIT ?`,
    [limit]
  );
  return rows;
}