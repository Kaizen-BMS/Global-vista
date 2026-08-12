import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { extendSubscription } from "@/lib/platform/actions/subscriptions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  assertPlatformOperator(session);
  const body = await request.json();
  if (!body.companyId || !body.days) return badRequest("companyId and days are required.");
  const result = await extendSubscription(body.companyId, Number(body.days), session.id);
  return ok(result);
}));
