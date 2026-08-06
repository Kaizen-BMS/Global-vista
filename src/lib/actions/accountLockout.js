import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
const MAX_FAILED_ATTEMPTS = 5; const LOCK_DURATION_MS = 15 * 60 * 1000;
export async function isAccountLocked(user) { return !!(user.locked_until && new Date(user.locked_until) > new Date()); }
export async function recordFailedLogin(userId) {
  const [[user]] = await pool.query(`SELECT failed_login_count FROM users WHERE id = ?`, [userId]);
  const next = (user?.failed_login_count || 0) + 1;
  if (next >= MAX_FAILED_ATTEMPTS) {
    await pool.query(`UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?`, [next, new Date(Date.now() + LOCK_DURATION_MS), userId]);
    await logActivity({ userId, module: "auth", action: "account_locked", entityType: "user", entityId: userId, description: `Locked after ${next} failed attempts` });
  } else {
    await pool.query(`UPDATE users SET failed_login_count = ? WHERE id = ?`, [next, userId]);
  }
}
export async function clearFailedLogins(userId) { await pool.query(`UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?`, [userId]); }