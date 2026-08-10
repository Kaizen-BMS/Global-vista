import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { releaseLead } from "@/lib/modules/crm/actions/leads";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  // Holding leads.assign (the same permission that gates bulk/manager
  // assignment) is what lets a manager release someone else's lead —
  // everyone else can only release a lead currently assigned to themselves.
  const canManage = await can(session, "leads.assign");
  const lead = await releaseLead(session, id, session.id, { force: canManage });
  return ok({ lead });
}));
