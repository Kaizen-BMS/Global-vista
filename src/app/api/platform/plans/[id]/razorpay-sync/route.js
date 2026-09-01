import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { syncPlanToRazorpay } from "@/lib/platform/actions/razorpayBilling";
import { isRazorpayConfigured } from "@/lib/payments/razorpayClient";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  assertPlatformOperator(session);
  if (!isRazorpayConfigured()) return badRequest("Razorpay isn't configured on this server (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET missing).");
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const result = await syncPlanToRazorpay(id, session.id, { force: !!body?.force });
  return ok(result);
}));
