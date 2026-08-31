import { getSession } from "@/lib/auth";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listDurationPricesForPlan, setDurationPrice } from "@/lib/platform/actions/planDurationPricing";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  assertPlatformOperator(session);
  const { id } = await ctx.params;
  const tiers = await listDurationPricesForPlan(id);
  return ok({ tiers });
});

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  const { id } = await ctx.params;
  const { durationMonths, price, status } = await request.json();
  if (!durationMonths) return badRequest("durationMonths is required.");
  if (!price) return badRequest("price is required.");
  await setDurationPrice(session, id, durationMonths, price, status);
  return ok({ saved: true });
}));
