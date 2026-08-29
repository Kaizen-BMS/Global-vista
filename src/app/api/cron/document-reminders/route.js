import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { runDocumentReminderCheck } from "@/lib/actions/employeeDocuments";

/**
 * Same shared-secret cron pattern as /api/cron/subscription-warnings,
 * /api/cron/lead-sync, and /api/cron/follow-up-reminders. Run this once a
 * day (e.g. via Hostinger cron) — the notifications table itself is the
 * dedupe guard against running it more often than that.
 */
export const POST = withErrorHandling(async (request) => {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return unauthorized();
  const results = await runDocumentReminderCheck();
  return ok(results);
});
