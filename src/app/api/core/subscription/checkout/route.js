import { getSession } from "@/lib/auth";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { startCompanyPayPalCheckout, assertPlanChangeAllowed } from "@/lib/platform/actions/paypalBilling";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!isSuperAdmin(session)) return forbidden();
  const { planId } = await request.json();
  if (!planId) return badRequest("planId is required.");

  // Usage-limit guard runs even on the checkout path — no point sending a
  // company through PayPal approval for a plan they'd immediately be told
  // they can't actually move to.
  await assertPlanChangeAllowed(session.company_id, planId);

  // PayPal appends `?subscription_id=...&ba_token=...&token=...` to
  // return_url itself on redirect — no placeholder needed/supported here.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const result = await startCompanyPayPalCheckout(session, planId, {
    returnUrl: `${appUrl}/workspace/settings/subscription/confirm`,
    cancelUrl: `${appUrl}/workspace/settings/subscription?checkout=cancelled`,
  });
  return ok(result);
}));
