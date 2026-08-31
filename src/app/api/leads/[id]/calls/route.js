import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listLeadCalls, startLeadCall } from "@/lib/modules/crm/actions/leadCalling";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.calls.view"))) return forbidden();
  const calls = await listLeadCalls(session, id);
  return ok({ calls });
});

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.calls.make"))) return forbidden();
  const result = await startLeadCall(session, id);
  return ok(result, 201);
}));
