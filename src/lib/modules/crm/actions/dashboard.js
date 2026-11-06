import "server-only";
import { pool } from "@/lib/db";
import { NOT_DELETED } from "@/lib/helpers/db";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";

// Was 6 separate round trips (one per count) — on the remote/shared DB
// host this app runs against, each round trip costs real latency on its
// own, and this function runs on every single dashboard load for every
// company. The 5 leads-table-only counts collapse into one query via
// conditional SUM (every COUNT(*) WHERE x becomes SUM(CASE WHEN x...)) —
// todaysFollowups stays separate since it's the only one that joins a
// different table.
export async function getLeadDashboardStats(session) {
  const { where, params } = await getVisibleLeadFilter(session);
  const [[counts]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN l.status = 'New' THEN 1 ELSE 0 END), 0) AS newLeads,
       COALESCE(SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END), 0) AS converted,
       COALESCE(SUM(CASE WHEN l.assigned_to = ? THEN 1 ELSE 0 END), 0) AS myLeads,
       COALESCE(SUM(CASE WHEN l.assigned_to IS NULL THEN 1 ELSE 0 END), 0) AS unassignedLeads
     FROM leads l WHERE l.${NOT_DELETED} AND ${where}`,
    [session.id, ...params]
  );
  const [[todaysFollowups]] = await pool.query(
    `SELECT COUNT(*) AS total FROM lead_followups f JOIN leads l ON l.id = f.lead_id AND l.${NOT_DELETED}
     WHERE ${where} AND DATE(f.scheduled_at) = CURDATE() AND f.status = 'Scheduled'`,
    params
  );
  const conversionRate = counts.total > 0 ? Math.round((counts.converted / counts.total) * 1000) / 10 : 0;
  return {
    totalLeads: counts.total,
    newLeads: counts.newLeads,
    converted: counts.converted,
    todaysFollowups: todaysFollowups.total,
    myLeads: counts.myLeads,
    unassignedLeads: counts.unassignedLeads,
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

/**
 * School-only variant of getTeamPerformance — breaks each counsellor's
 * students down by "Stream" (a per-school custom field, see
 * src/lib/modules/crm/actions/leadCustomFields.js) and by stage, instead
 * of a single converted/total count. Flat rows; the dashboard component
 * groups them client-side into counsellor -> stream -> stage.
 */
export async function getTeamPerformanceByStream(session) {
  const { where, params } = await getVisibleLeadFilter(session);
  const [rows] = await pool.query(
    `SELECT u.id AS counsellor_id, u.name AS counsellor_name,
            COALESCE(v.value, 'Unspecified') AS stream, l.stage, COUNT(*) AS student_count
     FROM leads l
     JOIN users u ON u.id = l.assigned_to
     LEFT JOIN lead_custom_fields f ON f.company_id = l.company_id AND f.field_key = 'stream' AND f.is_deleted = 0
     LEFT JOIN lead_custom_field_values v ON v.lead_id = l.id AND v.custom_field_id = f.id
     WHERE l.${NOT_DELETED} AND ${where} AND u.is_deleted = 0 AND u.status = 'active'
     GROUP BY u.id, u.name, stream, l.stage
     ORDER BY u.name, stream, l.stage`,
    params
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
