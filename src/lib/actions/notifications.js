import "server-only";
import { pool } from "@/lib/db";

export async function getUserNotifications(session, { unreadOnly = false, limit = 20 } = {}) {
  const where = unreadOnly ? "AND is_read=0" : "";
  const [rows] = await pool.query(`SELECT * FROM notifications WHERE user_id=? AND company_id=? ${where} ORDER BY created_at DESC LIMIT ?`, [session.id, session.company_id, limit]);
  return rows;
}
export async function markAllNotificationsRead(session) {
  await pool.query(`UPDATE notifications SET is_read=1 WHERE user_id=? AND company_id=?`, [session.id, session.company_id]);
}