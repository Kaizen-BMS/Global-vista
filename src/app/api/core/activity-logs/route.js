import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { getActivityLogs } from "@/lib/activityLog";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "activity_logs.view"))) return forbidden();
  const sp = new URL(request.url).searchParams;
  return ok({ logs: await getActivityLogs({ module: sp.get("module"), companyId: session.company_id, limit: Number(sp.get("limit")) || 50, offset: Number(sp.get("offset")) || 0 }) });
});