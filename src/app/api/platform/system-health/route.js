import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { pool } from "@/lib/db";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertPlatformOperator(session);
  const checks = {};
  try { await pool.query("SELECT 1"); checks.database = "healthy"; } catch { checks.database = "critical"; }
  const [[{ companyCount }]] = await pool.query(`SELECT COUNT(*) AS companyCount FROM companies WHERE status='active'`);
  return ok({ checks, details: { activeCompanies: companyCount, timestamp: new Date().toISOString() } });
});