import "server-only";
import { pool } from "@/lib/db";

// Was 3 separate round trips — collapsed into one query (3 independent
// scalar subqueries instead of 3 separate pool.query calls), since every
// query against this app's remote/shared DB host costs real latency on
// its own and this runs on every dashboard load.
export async function getDashboardStats(session) {
  const [[row]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE status='active' AND is_deleted=0 AND company_id=?) AS activeUsers,
       -- Company-scoped only — the global company_id-IS-NULL templates
       -- provisioning clones from aren't this company's own roles to count
       -- (see roles.js's own doc comment on the same distinction).
       (SELECT COUNT(*) FROM roles WHERE is_deleted=0 AND company_id=?) AS roles,
       (SELECT COUNT(*) FROM users WHERE locked_until IS NOT NULL AND locked_until > NOW() AND company_id=?) AS lockedAccounts`,
    [session.company_id, session.company_id, session.company_id]
  );
  return { activeUsers: row.activeUsers, roles: row.roles, lockedAccounts: row.lockedAccounts };
}