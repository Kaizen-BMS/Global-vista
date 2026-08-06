import "server-only";
import { pool } from "@/lib/db";

export async function createNotification({ userId, title, message = null, type = "info", link = null }) {
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
    [userId, title, message, type, link]
  );
}

export async function getUserNotifications(userId, { unreadOnly = false, limit = 20 } = {}) {
  const where = unreadOnly ? "AND is_read = 0" : "";
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE user_id = ? ${where} ORDER BY created_at DESC LIMIT ?`,
    [userId, limit]
  );
  return rows;
}

export async function markNotificationRead(id, userId) {
  await pool.query(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, userId]);
}

export async function markAllNotificationsRead(userId) {
  await pool.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
}