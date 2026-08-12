import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { listSubscriptions } from "@/lib/platform/actions/subscriptions";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertPlatformOperator(session);
  const subscriptions = await listSubscriptions();
  return ok({ subscriptions });
});
