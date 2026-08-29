import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { createPaymentRequest } from "@/lib/modules/crm/actions/paymentRequests";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  const body = await request.json();
  if (!body.amount) return badRequest("Amount is required.");
  const { token } = await createPaymentRequest(session, { leadId: id, amount: body.amount, note: body.note }, session.id);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  return ok({ token, publicUrl: `${appUrl}/pay/${token}` });
}));
