import { getSession } from "@/lib/auth";
import { assertSuperAdmin } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { pool } from "@/lib/db";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertSuperAdmin(session);
  const checks = {};
  try { await pool.query("SELECT 1"); checks.database = "healthy"; } catch { checks.database = "critical"; }
  const [[email]] = await pool.query(`SELECT SUM(status='sent') AS sent, SUM(status='failed') AS failed FROM email_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`);
  checks.email = (email.failed || 0) > (email.sent || 0) ? "warning" : "healthy";
  return ok({ checks, details: { emailsSent24h: email.sent || 0, emailsFailed24h: email.failed || 0, timestamp: new Date().toISOString() } });
});