import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { assignLead } from "@/lib/actions/leads";

export const POST = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.assign"))) return forbidden();
  const body = await request.json();
  if (!body.assignedTo) return badRequest("assignedTo is required.");
  await assignLead(id, body.assignedTo, session.id);
  return ok();
});