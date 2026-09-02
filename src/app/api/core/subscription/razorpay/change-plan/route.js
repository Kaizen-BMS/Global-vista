import { getSession } from "@/lib/auth";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { changeCompanyRazorpayPlan } from "@/lib/platform/actions/razorpayBilling";
import { assertPlanChangeAllowed } from "@/lib/platform/actions/subscriptionBilling";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!isSuperAdmin(session)) return forbidden();
  const { planId, when, couponCode, seatQuantity } = await request.json();
  if (!planId) return badRequest("planId is required.");

  // Same usage-limit guard the fresh-checkout path runs — no point
  // switching (now or scheduled) onto a plan the company already exceeds.
  await assertPlanChangeAllowed(session.company_id, planId, seatQuantity);

  const result = await changeCompanyRazorpayPlan(session, planId, when === "cycle_end" ? "cycle_end" : "now", couponCode?.trim() || null, seatQuantity);
  return ok(result);
}));
