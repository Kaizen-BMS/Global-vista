import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { cancelSubscription } from "@/lib/platform/actions/subscriptions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  assertPlatformOperator(session);
  const body = await request.json();
  if (!body.companyId) return badRequest("companyId is required.");
  await cancelSubscription(body.companyId, session.id);
  return ok();
}));
