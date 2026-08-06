import "server-only";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
const HISTORY_DEPTH = 5;
export async function wasPasswordUsedBefore(userId, plain) {
  const [rows] = await pool.query(`SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, [userId, HISTORY_DEPTH]);
  for (const row of rows) if (await bcrypt.compare(plain, row.password_hash)) return true;
  return false;
}
export async function recordPasswordHistory(userId, passwordHash) {
  await pool.query(`INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)`, [userId, passwordHash]);
  await pool.query(`DELETE FROM password_history WHERE user_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?) t)`, [userId, userId, HISTORY_DEPTH]);
}