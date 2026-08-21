import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { verifyAndConfirmRazorpaySubscriptionPublic } from "@/lib/platform/actions/razorpayBilling";
import { rateLimit } from "@/lib/helpers/rateLimit";

/**
 * Public, unauthenticated by design — same reasoning as /api/public/register
 * itself: the registrant has no session yet when Razorpay Checkout's
 * in-page modal reports success. Signature verification (inside
 * verifyAndConfirmRazorpaySubscriptionPublic) is the actual security
 * boundary here, not a session or CSRF token.
 */
export const POST = withErrorHandling(async (request) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`register-razorpay-verify:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 }).allowed) {
    return badRequest("Too many attempts. Please try again later.");
  }
  const { razorpaySubscriptionId, razorpayPaymentId, razorpaySignature } = await request.json();
  if (!razorpaySubscriptionId || !razorpayPaymentId || !razorpaySignature) return badRequest("Missing Razorpay checkout response fields.");

  const result = await verifyAndConfirmRazorpaySubscriptionPublic({ razorpaySubscriptionId, razorpayPaymentId, razorpaySignature });
  return ok(result);
});
