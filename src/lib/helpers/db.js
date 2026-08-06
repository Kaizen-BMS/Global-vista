import "server-only";
import { pool } from "@/lib/db";

export const NOT_DELETED = "is_deleted = 0";

export async function softDelete(table, id, deletedBy) {
  await pool.query(`UPDATE ${table} SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?, status = 'inactive' WHERE id = ?`, [deletedBy, id]);
}
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (err) { await conn.rollback(); throw err; }
  finally { conn.release(); }
}
export function paginate({ page = 1, pageSize = 20 }) {
  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
  return { limit: size, offset: (p - 1) * size, page: p, pageSize: size };
}