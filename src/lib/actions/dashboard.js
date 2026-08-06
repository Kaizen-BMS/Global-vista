import "server-only";
import { pool } from "@/lib/db";

export async function getDashboardStats(session) {
  const [[users]] = await pool.query(`SELECT COUNT(*) AS total FROM users WHERE status='active' AND is_deleted=0 AND company_id=?`, [session.company_id]);
  const [[roles]] = await pool.query(`SELECT COUNT(*) AS total FROM roles WHERE is_deleted=0 AND (company_id=? OR company_id IS NULL)`, [session.company_id]);
  const [[locked]] = await pool.query(`SELECT COUNT(*) AS total FROM users WHERE locked_until IS NOT NULL AND locked_until > NOW() AND company_id=?`, [session.company_id]);
  return { activeUsers: users.total, roles: roles.total, lockedAccounts: locked.total };
}