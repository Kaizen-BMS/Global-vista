import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { updatePlan } from "@/lib/platform/actions/subscriptions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  assertPlatformOperator(session);
  const body = await request.json();
  if (!body.name) return badRequest("Plan name is required.");
  await updatePlan(id, body);
  return ok();
}));
