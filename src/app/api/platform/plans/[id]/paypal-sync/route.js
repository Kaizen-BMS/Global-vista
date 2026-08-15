import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { syncPlanToPayPal } from "@/lib/platform/actions/paypalBilling";
import { isPayPalConfigured } from "@/lib/payments/paypalClient";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  assertPlatformOperator(session);
  if (!isPayPalConfigured()) return badRequest("PayPal isn't configured on this server (PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET missing).");
  const { id } = await ctx.params;
  const result = await syncPlanToPayPal(id, session.id);
  return ok(result);
}));
