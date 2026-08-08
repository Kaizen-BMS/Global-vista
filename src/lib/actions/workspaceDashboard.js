import "server-only";
import { pool } from "@/lib/db";

/**
 * HR/org-side stats for the workspace executive dashboard. Two metrics
 * from the original spec have zero backing schema — no `attendance` or
 * `leaves` table exists anywhere in the 42-table schema — so Attendance
 * and Leave Trend are surfaced as explicit "not available" states by
 * the UI layer rather than fabricated here. Everything else below is a
 * real, company-scoped query.
 */
export async function getWorkspaceOrgStats(session) {
  const companyId = session.company_id;
  const [
    [[departments]], [[branches]], [[designations]], [[permissions]],
    [[documents]], [[pendingTasks]],
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM departments WHERE company_id=? AND is_deleted=0`, [companyId]),
    pool.query(`SELECT COUNT(*) AS total FROM branches WHERE company_id=? AND is_deleted=0`, [companyId]),
    pool.query(
      `SELECT COUNT(*) AS total FROM designations d JOIN departments dept ON dept.id=d.department_id
       WHERE dept.company_id=? AND d.is_deleted=0 AND dept.is_deleted=0`,
      [companyId]
    ),
    pool.query(
      `SELECT COUNT(DISTINCT p.id) AS total FROM permissions p
       WHERE p.status='active' AND (p.module_slug IN ('core','platform') OR EXISTS (
         SELECT 1 FROM company_modules cm JOIN modules m ON m.id=cm.module_id
         WHERE cm.company_id=? AND cm.enabled=1 AND m.slug=p.module_slug
       ))`,
      [companyId]
    ),
    pool.query(
      `SELECT
        (SELECT COUNT(*) FROM lead_documents WHERE company_id=?) +
        (SELECT COUNT(*) FROM employee_documents ed JOIN users u ON u.id=ed.user_id WHERE u.company_id=? AND u.is_deleted=0 AND ed.is_deleted=0)
       AS total`,
      [companyId, companyId]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM lead_tasks WHERE company_id=? AND is_completed=0`, [companyId]),
  ]);

  return {
    departments: departments.total, branches: branches.total, designations: designations.total,
    permissions: permissions.total, documents: documents.total, pendingTasks: pendingTasks.total,
  };
}

export async function getUpcomingWorkAnniversaries(session, withinDays = 30) {
  const [rows] = await pool.query(
    `SELECT id, name, joining_date,
       DATEDIFF(
         DATE_ADD(joining_date, INTERVAL (YEAR(CURDATE()) - YEAR(joining_date) + IF(DAYOFYEAR(CURDATE()) > DAYOFYEAR(joining_date), 1, 0)) YEAR),
         CURDATE()
       ) AS days_until
     FROM users
     WHERE company_id=? AND is_deleted=0 AND status='active' AND joining_date IS NOT NULL
     HAVING days_until BETWEEN 0 AND ?
     ORDER BY days_until ASC LIMIT 8`,
    [session.company_id, withinDays]
  );
  return rows;
}

export async function getRecentLogins(session, limit = 8) {
  const [rows] = await pool.query(
    `SELECT ulh.id, u.name, ulh.ip_address, ulh.created_at
     FROM user_login_history ulh JOIN users u ON u.id = ulh.user_id
     WHERE u.company_id=? AND ulh.event='login'
     ORDER BY ulh.created_at DESC LIMIT ?`,
    [session.company_id, limit]
  );
  return rows;
}

export async function getEmployeeGrowth(session, range) {
  if (range?.start && range?.end) {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM users WHERE company_id=? AND is_deleted=0 AND created_at BETWEEN ? AND ?
       GROUP BY month ORDER BY month ASC`,
      [session.company_id, range.start, range.end]
    );
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
     FROM users WHERE company_id=? AND is_deleted=0 AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
     GROUP BY month ORDER BY month ASC`,
    [session.company_id]
  );
  return rows;
}

export async function getDepartmentDistribution(session) {
  const [rows] = await pool.query(
    `SELECT d.name AS department, COUNT(u.id) AS count
     FROM departments d LEFT JOIN users u ON u.department_id=d.id AND u.is_deleted=0 AND u.status='active'
     WHERE d.company_id=? AND d.is_deleted=0
     GROUP BY d.id, d.name ORDER BY count DESC`,
    [session.company_id]
  );
  return rows;
}

export async function getRoleDistribution(session) {
  const [rows] = await pool.query(
    `SELECT r.name AS role, COUNT(u.id) AS count
     FROM roles r LEFT JOIN users u ON u.role_id=r.id AND u.is_deleted=0 AND u.status='active' AND u.company_id=?
     WHERE (r.company_id=? OR r.company_id IS NULL) AND r.is_deleted=0
     GROUP BY r.id, r.name HAVING count > 0 ORDER BY count DESC`,
    [session.company_id, session.company_id]
  );
  return rows;
}

export async function getDocumentUploadTrend(session, range) {
  if (range?.start && range?.end) {
    const [rows] = await pool.query(
      `SELECT day, SUM(count) AS count FROM (
         SELECT DATE(created_at) AS day, COUNT(*) AS count FROM lead_documents
         WHERE company_id=? AND created_at BETWEEN ? AND ? GROUP BY day
         UNION ALL
         SELECT DATE(ed.created_at) AS day, COUNT(*) AS count FROM employee_documents ed JOIN users u ON u.id=ed.user_id
         WHERE u.company_id=? AND ed.is_deleted=0 AND ed.created_at BETWEEN ? AND ? GROUP BY day
       ) combined GROUP BY day ORDER BY day ASC`,
      [session.company_id, range.start, range.end, session.company_id, range.start, range.end]
    );
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT day, SUM(count) AS count FROM (
       SELECT DATE(created_at) AS day, COUNT(*) AS count FROM lead_documents
       WHERE company_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY day
       UNION ALL
       SELECT DATE(ed.created_at) AS day, COUNT(*) AS count FROM employee_documents ed JOIN users u ON u.id=ed.user_id
       WHERE u.company_id=? AND ed.is_deleted=0 AND ed.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY day
     ) combined GROUP BY day ORDER BY day ASC`,
    [session.company_id, session.company_id]
  );
  return rows;
}
