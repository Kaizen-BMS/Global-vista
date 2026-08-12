import { pool } from "@/lib/db";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { sendFollowupReminderEmail } from "@/lib/modules/crm/actions/followupNotifications";

/**
 * Scheduler-safe, same pattern as /api/cron/lead-sync: a shared secret
 * header instead of a session cookie, safe to call as often as you like —
 * `reminder_sent_at IS NULL` in the WHERE clause is the entire idempotency
 * mechanism, so a follow-up only ever matches this query once.
 */
export const POST = withErrorHandling(async (request) => {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return unauthorized();

  const [due] = await pool.query(
    `SELECT id, company_id, lead_id, type, scheduled_at FROM lead_followups
     WHERE status = 'Scheduled' AND reminder_sent_at IS NULL
       AND scheduled_at > NOW() AND DATE_SUB(scheduled_at, INTERVAL 24 HOUR) <= NOW()`
  );

  const results = [];
  for (const followup of due) {
    const result = await sendFollowupReminderEmail(followup, followup.company_id, null);
    results.push({ id: followup.id, ...result });
  }
  return ok({ checked: due.length, results });
});
