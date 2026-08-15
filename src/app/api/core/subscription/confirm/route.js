import { getSession } from "@/lib/auth";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { confirmCompanySubscriptionFromPayPal } from "@/lib/platform/actions/paypalBilling";
import { isSuperAdmin } from "@/lib/helpers/permissions";

/**
 * Called by the return-URL confirmation page after the browser comes back
 * from PayPal. This NEVER treats the redirect itself as proof — it always
 * re-fetches the subscription from PayPal server-side before writing
 * anything. Also invoked by the webhook for the same event, so this is
 * intentionally idempotent (confirmCompanySubscriptionFromPayPal is safe to
 * call twice for the same PayPal subscription id).
 */
export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!isSuperAdmin(session)) return forbidden();
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get("subscription_id");
  if (!subscriptionId) return badRequest("subscription_id is required.");

  const result = await confirmCompanySubscriptionFromPayPal(subscriptionId);
  if (result.companyId !== session.company_id) return forbidden();
  return ok(result);
});
