import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { destroyAllSessions } from "@/lib/auth";
export async function listUserSessions(userId, currentJti) {
  const [rows] = await pool.query(`SELECT id, jti, ip_address, user_agent, created_at, last_seen_at FROM user_sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_seen_at DESC`, [userId]);
  return rows.map((r) => ({ ...r, is_current: r.jti === currentJti }));
}
export async function terminateSession(sessionRowId, userId) { await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE id = ? AND user_id = ?`, [sessionRowId, userId]); }
export async function logoutAllDevices(userId, currentJti, actorId) {
  await destroyAllSessions(userId, currentJti);
  await logActivity({ userId: actorId, module: "auth", action: "logout_all_devices", entityType: "user", entityId: userId, description: "Logged out of all other devices" });
}