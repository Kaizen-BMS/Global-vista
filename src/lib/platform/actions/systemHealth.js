import "server-only";
import { pool } from "@/lib/db";

export async function getSystemHealth() {
  const checks = {};
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    checks.database = { status: "healthy", latencyMs: Date.now() - start };
  } catch {
    checks.database = { status: "critical", latencyMs: null };
  }

  const [[{ activeCompanies }]] = await pool.query(`SELECT COUNT(*) AS activeCompanies FROM companies WHERE status='active'`);
  const [[{ failedProvisioning }]] = await pool.query(`SELECT COUNT(*) AS failedProvisioning FROM company_provisioning_log WHERE status='failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
  const [[{ failedEmails }]] = await pool.query(`SELECT COUNT(*) AS failedEmails FROM email_logs WHERE status='failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
  const [[{ lockedAccounts }]] = await pool.query(`SELECT COUNT(*) AS lockedAccounts FROM users WHERE locked_until IS NOT NULL AND locked_until > NOW()`);

  checks.provisioning = { status: failedProvisioning > 0 ? "warning" : "healthy", failedLast7Days: failedProvisioning };
  checks.email = { status: failedEmails > 0 ? "warning" : "healthy", failedLast7Days: failedEmails };

  return {
    checks,
    details: { activeCompanies, lockedAccounts, timestamp: new Date().toISOString() },
  };
}
