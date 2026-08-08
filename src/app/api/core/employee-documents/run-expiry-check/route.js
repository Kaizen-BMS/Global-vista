import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { runExpiryMaintenance } from "@/lib/actions/employeeDocuments";
import { withCsrf } from "@/lib/helpers/withCsrf";

// Not wired to a scheduler — this Next.js app has no built-in cron/job
// runner. Trigger this endpoint from an external scheduler (platform cron,
// GitHub Actions schedule, cron-job.org, etc.) to mark documents Expired
// and send expiry-reminder notifications on a daily cadence.
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return forbidden();
  const result = await runExpiryMaintenance(session);
  return ok(result);
}));
