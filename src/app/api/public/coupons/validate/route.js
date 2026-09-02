import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { previewCoupon } from "@/lib/platform/actions/coupons";
import { rateLimit } from "@/lib/helpers/rateLimit";

/**
 * Public, unauthenticated by design — the registration flow's "Apply"
 * button needs to preview a coupon before an account even exists. Pure
 * preview, no side effects (no redemption is recorded here), so this is
 * safe to expose without a session. Rate-limited per IP the same way
 * every other public/register endpoint is, since it's an easy code-guessing
 * target otherwise.
 */
export const POST = withErrorHandling(async (request) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`public-coupon-validate:${ip}`, { max: 20, windowMs: 60 * 60 * 1000 }).allowed) {
    return badRequest("Too many attempts. Please try again later.");
  }
  const { code, planId, seatQuantity } = await request.json();
  if (!code || !planId) return badRequest("code and planId are required.");

  const preview = await previewCoupon(code, planId, seatQuantity || 1);
  return ok(preview);
});
