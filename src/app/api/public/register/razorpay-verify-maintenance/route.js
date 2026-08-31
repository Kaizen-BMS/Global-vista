import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { verifyAndConfirmRazorpayMaintenanceSubscriptionPublic } from "@/lib/platform/actions/razorpayBilling";
import { rateLimit } from "@/lib/helpers/rateLimit";

/**
 * The second Checkout overlay's callback during signup (the annual
 * maintenance fee, for a plan that has one) — same public,
 * signature-is-the-security-boundary reasoning as razorpay-verify/route.js.
 */
export const POST = withErrorHandling(async (request) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`register-razorpay-verify-maintenance:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 }).allowed) {
    return badRequest("Too many attempts. Please try again later.");
  }
  const { razorpaySubscriptionId, razorpayPaymentId, razorpaySignature } = await request.json();
  if (!razorpaySubscriptionId || !razorpayPaymentId || !razorpaySignature) return badRequest("Missing Razorpay checkout response fields.");

  const result = await verifyAndConfirmRazorpayMaintenanceSubscriptionPublic({ razorpaySubscriptionId, razorpayPaymentId, razorpaySignature });
  return ok(result);
});
