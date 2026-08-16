import { getSession } from "@/lib/auth";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { startCompanyRazorpayCheckout } from "@/lib/platform/actions/razorpayBilling";
import { assertPlanChangeAllowed } from "@/lib/platform/actions/subscriptionBilling";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!isSuperAdmin(session)) return forbidden();
  const { planId } = await request.json();
  if (!planId) return badRequest("planId is required.");

  // Usage-limit guard runs even on the checkout path — no point opening
  // Razorpay Checkout for a plan the company would immediately be told
  // they can't actually move to.
  await assertPlanChangeAllowed(session.company_id, planId);

  const result = await startCompanyRazorpayCheckout(session, planId);
  return ok(result);
}));
