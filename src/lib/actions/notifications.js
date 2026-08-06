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
export async function markNotificationRead(session, id) {
  await pool.query(`UPDATE notifications SET is_read=1 WHERE id=? AND user_id=? AND company_id=?`, [id, session.id, session.company_id]);
}

/**
 * Creates a single in-app notification for one user. Silently no-ops
 * if userId is null/undefined (e.g. an unassigned lead/task) rather
 * than throwing — notification delivery should never fail the calling
 * business action.
 */
export async function createNotification(companyId, userId, { title, message = null, type = "info", link = null }) {
  if (!userId) return;
  await pool.query(
    `INSERT INTO notifications (company_id, user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?, ?)`,
    [companyId, userId, title, message, type, link]
  );
}