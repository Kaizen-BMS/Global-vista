import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getPayPalStatus, getRazorpayStatus } from "@/lib/payments/providers";

/** Lets the checkout UI show/hide each payment method card based on REAL
 * server-side configuration — never a hardcoded "both available" assumption. */
export const GET = withErrorHandling(async () => {
  const [paypal, razorpay] = await Promise.all([getPayPalStatus(), getRazorpayStatus()]);
  return ok({ paypal, razorpay });
});
