import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { mergeLead } from "@/lib/modules/crm/actions/leads";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  const body = await request.json();
  if (!body.targetId) return badRequest("targetId is required.");
  await mergeLead(session, id, body.targetId, session.id);
  return ok();
}));
