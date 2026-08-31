import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { listRedemptionsForCoupon } from "@/lib/platform/actions/coupons";

export const GET = withErrorHandling(async (request, { params }) => {
  const session = await getSession();
  const { id } = await params;
  const redemptions = await listRedemptionsForCoupon(session, id);
  return ok({ redemptions });
});
