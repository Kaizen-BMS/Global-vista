import "server-only";
import { pool } from "@/lib/db";
import { NOT_DELETED } from "@/lib/helpers/db";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";

export async function getLeadDashboardStats(session) {
  const { where, params } = await getVisibleLeadFilter(session);
  const [[leadCount]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE l.${NOT_DELETED} AND ${where}`, params);
  const [[newLeads]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE l.status='New' AND l.${NOT_DELETED} AND ${where}`, params);
  const [[converted]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE l.status='Converted' AND l.${NOT_DELETED} AND ${where}`, params);
  const [[todaysFollowups]] = await pool.query(
    `SELECT COUNT(*) AS total FROM lead_followups f JOIN leads l ON l.id = f.lead_id AND l.${NOT_DELETED}
     WHERE ${where} AND DATE(f.scheduled_at) = CURDATE() AND f.status = 'Scheduled'`,
    params
  );
  // Same visible pool, split by ownership — "how much of what I can see is
  // mine to work vs still up for grabs," the same distinction the Leads
  // list's quick tabs (Assigned to Me / Unassigned) surface.
  const [[myLeads]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE l.${NOT_DELETED} AND ${where} AND l.assigned_to = ?`, [...params, session.id]);
  const [[unassignedLeads]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE l.${NOT_DELETED} AND ${where} AND l.assigned_to IS NULL`, params);
  const conversionRate = leadCount.total > 0 ? Math.round((converted.total / leadCount.total) * 1000) / 10 : 0;
  return {
    totalLeads: leadCount.total,
    newLeads: newLeads.total,
    converted: converted.total,
    todaysFollowups: todaysFollowups.total,
    myLeads: myLeads.total,
    unassignedLeads: unassignedLeads.total,
    conversionRate,
  };
}

export async function getLeadsBySource(session) {
  const { where, params } = await getVisibleLeadFilter(session);
  const [rows] = await pool.query(
    `SELECT s.name AS source, COUNT(l.id) AS count
     FROM lead_sources s
     LEFT JOIN leads l ON l.lead_source_id = s.id AND l.${NOT_DELETED} AND ${where}
     WHERE s.${NOT_DELETED} AND s.company_id = ?
     GROUP BY s.id ORDER BY count DESC`,
    [...params, session.company_id]
  );
  return rows;
}

export async function getLeadsByService(session) {
  const { where, params } = await getVisibleLeadFilter(session);
  const [rows] = await pool.query(
    `SELECT sv.name AS service, COUNT(l.id) AS count
     FROM services sv
     LEFT JOIN leads l ON l.service_id = sv.id AND l.${NOT_DELETED} AND ${where}
     WHERE sv.${NOT_DELETED} AND sv.company_id = ?
     GROUP BY sv.id ORDER BY count DESC`,
    [...params, session.company_id]
  );
  return rows;
}

export async function getLeadsByStage(session) {
  const { where, params } = await getVisibleLeadFilter(session);
  const [rows] = await pool.query(
    `SELECT l.stage, COUNT(*) AS count FROM leads l WHERE l.${NOT_DELETED} AND ${where} GROUP BY l.stage`,
    params
  );
  return rows;
}

export async function getMonthlyLeadTrend(session, range) {
  const { where, params } = await getVisibleLeadFilter(session);
  if (range?.start && range?.end) {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(l.created_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM leads l WHERE l.${NOT_DELETED} AND ${where} AND l.created_at BETWEEN ? AND ?
       GROUP BY month ORDER BY month ASC`,
      [...params, range.start, range.end]
    );
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(l.created_at, '%Y-%m') AS month, COUNT(*) AS count
     FROM leads l WHERE l.${NOT_DELETED} AND ${where} AND l.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
     GROUP BY month ORDER BY month ASC`,
    params
  );
  return rows;
}

export async function getTeamPerformance(session) {
  const { where, params } = await getVisibleLeadFilter(session);
  const [rows] = await pool.query(
    `SELECT u.id, u.name, COUNT(l.id) AS total_leads, SUM(l.status='Converted') AS converted
     FROM users u LEFT JOIN leads l ON l.assigned_to = u.id AND l.${NOT_DELETED} AND ${where}
     WHERE u.company_id = ? AND u.is_deleted = 0 AND u.status = 'active'
     GROUP BY u.id, u.name HAVING total_leads > 0 ORDER BY converted DESC, total_leads DESC LIMIT 8`,
    [...params, session.company_id]
  );
  return rows;
}

export async function getRecentLeads(session, limit = 6) {
  const { where, params } = await getVisibleLeadFilter(session);
  const [rows] = await pool.query(
    `SELECT l.id, l.name, l.status, s.name AS source_name, sv.name AS service_name
     FROM leads l
     JOIN lead_sources s ON s.id = l.lead_source_id
     JOIN services sv ON sv.id = l.service_id
     WHERE l.${NOT_DELETED} AND ${where}
     ORDER BY l.created_at DESC LIMIT ?`,
    [...params, limit]
  );
  return rows;
}
