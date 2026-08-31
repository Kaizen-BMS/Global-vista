import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { deleteDurationPrice } from "@/lib/platform/actions/planDurationPricing";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  const { priceId } = await ctx.params;
  await deleteDurationPrice(session, priceId);
  return ok({ deleted: true });
}));
