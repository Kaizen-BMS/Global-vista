import { getSession } from "@/lib/auth";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { verifyAndConfirmRazorpayMaintenanceSubscription } from "@/lib/platform/actions/razorpayBilling";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

/**
 * Same signature-verification trust boundary as /verify, for the second
 * Checkout overlay (the annual maintenance fee) a per_user plan with
 * maintenance_annual_fee opens right after the main subscription's payment
 * succeeds — see SubscriptionManager.js's payWithRazorpayThenFinish.
 */
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!isSuperAdmin(session)) return forbidden();
  const { razorpaySubscriptionId, razorpayPaymentId, razorpaySignature } = await request.json();
  if (!razorpaySubscriptionId || !razorpayPaymentId || !razorpaySignature) return badRequest("Missing Razorpay checkout response fields.");

  const result = await verifyAndConfirmRazorpayMaintenanceSubscription({ session, razorpaySubscriptionId, razorpayPaymentId, razorpaySignature });
  return ok(result);
}));
