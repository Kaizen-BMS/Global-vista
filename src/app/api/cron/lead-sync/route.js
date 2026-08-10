import { pool } from "@/lib/db";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { runSync } from "@/lib/actions/leadSync";

/**
 * Scheduler-safe entry point — no browser session involved, so it's
 * protected by a shared secret header instead of a cookie. Point a
 * Hostinger (or any) cron job at this URL:
 *
 *   POST https://<your-domain>/api/cron/lead-sync
 *   Header: X-Cron-Secret: <CRON_SECRET env value>
 *
 * Safe to call as often as you like (every minute, if you want) — each
 * run only processes sources whose frequency_minutes window has actually
 * elapsed since last_sync_at, and runSync() itself is idempotent per
 * external_lead_id. Until CRON_SECRET is set in the environment, this
 * endpoint refuses every request — there is no "automatic sync" running
 * unless a real scheduler is actually configured to call it.
 */
export const POST = withErrorHandling(async (request) => {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return unauthorized();

  const [due] = await pool.query(
    `SELECT * FROM lead_sync_sources
     WHERE status = 'enabled' AND is_deleted = 0
       AND (last_sync_at IS NULL OR last_sync_at <= DATE_SUB(NOW(), INTERVAL frequency_minutes MINUTE))`
  );

  const results = [];
  for (const row of due) {
    const source = { ...row, column_mapping: JSON.parse(row.column_mapping || "{}") };
    try { results.push({ id: source.id, name: source.name, ...(await runSync(source)) }); }
    catch (err) { results.push({ id: source.id, name: source.name, status: "failed", error: err.message }); }
  }
  return ok({ checked: due.length, results });
});
