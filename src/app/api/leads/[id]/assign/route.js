import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { assignLead } from "@/lib/modules/crm/actions/leads";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.assign"))) return forbidden();
  const body = await request.json();
  if (!body.assignedTo) return badRequest("assignedTo is required.");
  await assignLead(session, id, body.assignedTo, session.id);
  return ok();
}));