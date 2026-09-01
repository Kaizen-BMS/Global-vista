import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { previewCoupon } from "@/lib/platform/actions/coupons";
import { isSuperAdmin } from "@/lib/helpers/permissions";

/** Same pure-preview reasoning as /api/public/coupons/validate, for an
 * already-logged-in company switching/subscribing to a plan. */
export const POST = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isSuperAdmin(session)) return forbidden();
  const { code, planId } = await request.json();
  if (!code || !planId) return badRequest("code and planId are required.");

  const preview = await previewCoupon(code, planId);
  return ok(preview);
});
