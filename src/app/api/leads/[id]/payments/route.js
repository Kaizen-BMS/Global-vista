import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listPaymentPlansForLead, createPaymentPlan } from "@/lib/modules/crm/actions/payments";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const plans = await listPaymentPlansForLead(session, id);
  return ok({ plans });
});

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  const body = await request.json();
  if (!body.serviceId) return badRequest("Service is required.");
  if (!body.originalAmount) return badRequest("Original amount is required.");
  const planId = await createPaymentPlan(session, id, body, session.id);
  return created({ id: planId });
}));
