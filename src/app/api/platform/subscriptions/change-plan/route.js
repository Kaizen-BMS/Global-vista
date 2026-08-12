import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { changeSubscriptionPlan } from "@/lib/platform/actions/subscriptions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  assertPlatformOperator(session);
  const body = await request.json();
  if (!body.companyId || !body.planId) return badRequest("companyId and planId are required.");
  const result = await changeSubscriptionPlan(body.companyId, body.planId, session.id);
  return ok(result);
}));
