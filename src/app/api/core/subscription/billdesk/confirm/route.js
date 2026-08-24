import { getSession } from "@/lib/auth";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { confirmCompanySubscriptionFromBillDesk } from "@/lib/platform/actions/billdeskBilling";
import { isSuperAdmin } from "@/lib/helpers/permissions";

/**
 * Called by the return-URL confirmation page after the browser comes back
 * from BillDesk. This NEVER treats the redirect itself as proof — it always
 * re-verifies the transaction with BillDesk server-side before writing
 * anything (see confirmCompanySubscriptionFromBillDesk /
 * verifyBillDeskTransaction). Also invoked by the webhook for the same
 * event, so this is intentionally idempotent — safe to call twice for the
 * same order.
 *
 * The exact query parameter BillDesk's return URL carries the order/
 * transaction reference under is not known yet (see billdeskClient.js) —
 * this accepts `order_id` as a placeholder name; update it once BillDesk's
 * actual return-URL contract is available.
 */
export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!isSuperAdmin(session)) return forbidden();
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order_id");
  if (!orderId) return badRequest("order_id is required.");

  const result = await confirmCompanySubscriptionFromBillDesk(orderId);
  if (result.companyId !== session.company_id) return forbidden();
  return ok(result);
});
