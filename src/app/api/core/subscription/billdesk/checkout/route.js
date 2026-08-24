import { getSession } from "@/lib/auth";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { startCompanyBillDeskCheckout } from "@/lib/platform/actions/billdeskBilling";
import { assertPlanChangeAllowed } from "@/lib/platform/actions/subscriptionBilling";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!isSuperAdmin(session)) return forbidden();
  const { planId, couponCode } = await request.json();
  if (!planId) return badRequest("planId is required.");

  // Usage-limit guard runs even on the checkout path — no point sending a
  // company through BillDesk checkout for a plan they'd immediately be told
  // they can't actually move to.
  await assertPlanChangeAllowed(session.company_id, planId);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const result = await startCompanyBillDeskCheckout(session, planId, {
    returnUrl: `${appUrl}/workspace/settings/subscription/confirm`,
    couponCode: couponCode || null,
  });
  return ok(result);
}));
