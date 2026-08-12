import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { renewSubscription } from "@/lib/platform/actions/subscriptions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  assertPlatformOperator(session);
  const body = await request.json();
  if (!body.companyId || !body.endsAt) return badRequest("companyId and endsAt are required.");
  await renewSubscription(body.companyId, body.endsAt, session.id);
  return ok();
}));
