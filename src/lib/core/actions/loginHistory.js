import "server-only";
import { pool } from "@/lib/db";

export async function recordLoginEvent(userId, event, { ipAddress = null, userAgent = null } = {}) {
  await pool.query(
    `INSERT INTO user_login_history (user_id, event, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
    [userId, event, ipAddress, userAgent]
  );
}

export async function getUserLoginHistory(userId, limit = 20) {
  const [rows] = await pool.query(
    `SELECT * FROM user_login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, limit]
  );
  return rows;
}