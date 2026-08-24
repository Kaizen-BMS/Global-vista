import { getSession } from "@/lib/auth";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listCouponsForAdmin, createCoupon } from "@/lib/platform/actions/coupons";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertPlatformOperator(session);
  const coupons = await listCouponsForAdmin();
  return ok({ coupons });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  const data = await request.json();
  if (!data.code) return badRequest("Coupon code is required.");
  const result = await createCoupon(session, data);
  return ok(result, 201);
}));
