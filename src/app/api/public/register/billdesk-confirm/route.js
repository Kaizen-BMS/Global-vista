import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { confirmCompanySubscriptionFromBillDesk } from "@/lib/platform/actions/billdeskBilling";
import { rateLimit } from "@/lib/helpers/rateLimit";

/**
 * Public counterpart of /api/core/subscription/billdesk/confirm — used by
 * the registration flow's return-URL page, where the admin isn't logged in
 * yet. No session to scope against (the browser just came straight from
 * BillDesk with no cookie for the brand-new account), so this is guarded by
 * rate limiting + the fact that it can only ever RE-SYNC a subscription's
 * state from BillDesk's own verified data, never set a price or grant
 * access beyond what the already-created 'pending' row points at.
 */
export const GET = withErrorHandling(async (request) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`register-billdesk-confirm:${ip}`, { max: 20, windowMs: 10 * 60 * 1000 }).allowed) {
    return badRequest("Too many attempts. Please try again shortly.");
  }
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order_id");
  if (!orderId) return badRequest("order_id is required.");

  const result = await confirmCompanySubscriptionFromBillDesk(orderId);
  return ok(result);
});
