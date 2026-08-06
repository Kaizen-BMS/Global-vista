import "server-only";
import { pool } from "@/lib/db";

export async function getLeadTimeline(session, leadId) {
  const [rows] = await pool.query(
    `SELECT al.*, u.name AS user_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.module = 'leads' AND al.entity_type = 'lead' AND al.entity_id = ? AND al.company_id = ?
     ORDER BY al.created_at DESC`,
    [leadId, session.company_id]
  );
  return rows;
}