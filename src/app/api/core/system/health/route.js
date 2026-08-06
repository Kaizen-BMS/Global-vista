import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { pool } from "@/lib/db";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "system_health.view"))) return forbidden();

  const checks = { database: "unknown", email: "unknown" };
  const details = {};

  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    checks.database = "healthy";
    details.databaseLatencyMs = Date.now() - start;
  } catch (err) {
    checks.database = "error";
    details.databaseError = err.message;
  }

  try {
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM email_logs WHERE status = 'sent' AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    const [[{ failedCount }]] = await pool.query(
      `SELECT COUNT(*) AS failedCount FROM email_logs WHERE status = 'failed' AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    details.emailsSent24h = count;
    details.emailsFailed24h = failedCount;
    checks.email = failedCount > count ? "degraded" : "healthy";
  } catch (err) {
    checks.email = "error";
  }

  const [[{ lockedCount }]] = await pool.query(
    `SELECT COUNT(*) AS lockedCount FROM users WHERE locked_until IS NOT NULL AND locked_until > NOW()`
  );

  return ok({
    checks,
    details: { ...details, lockedAccounts: lockedCount, nodeEnv: process.env.NODE_ENV, timestamp: new Date().toISOString() },
  });
});