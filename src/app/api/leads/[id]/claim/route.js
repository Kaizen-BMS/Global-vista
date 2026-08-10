import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { claimLead } from "@/lib/modules/crm/actions/leads";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  const lead = await claimLead(session, id, session.id);
  return ok({ lead });
}));
