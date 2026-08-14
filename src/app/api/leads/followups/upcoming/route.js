import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { getUpcomingFollowupReminders } from "@/lib/modules/crm/actions/leadFollowups";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return forbidden();
  if (!(await can(session, "leads.view"))) return ok({ followups: [] });
  const followups = await getUpcomingFollowupReminders(session);
  return ok({ followups });
});
