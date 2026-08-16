import { getSession } from "@/lib/auth";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { verifyAndConfirmRazorpaySubscription } from "@/lib/platform/actions/razorpayBilling";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

/**
 * Called immediately after Razorpay Checkout's JS overlay reports success
 * to the browser (handler callback). This is NOT treated as proof of
 * payment on its own — verifyAndConfirmRazorpaySubscription re-derives an
 * HMAC signature server-side and rejects anything that doesn't match
 * before ever touching the subscription's status, then re-fetches the
 * subscription from Razorpay itself.
 */
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!isSuperAdmin(session)) return forbidden();
  const { razorpaySubscriptionId, razorpayPaymentId, razorpaySignature } = await request.json();
  if (!razorpaySubscriptionId || !razorpayPaymentId || !razorpaySignature) return badRequest("Missing Razorpay checkout response fields.");

  const result = await verifyAndConfirmRazorpaySubscription({ session, razorpaySubscriptionId, razorpayPaymentId, razorpaySignature });
  return ok(result);
}));
