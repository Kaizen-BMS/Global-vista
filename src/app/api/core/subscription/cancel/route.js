import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { cancelOwnSubscription } from "@/lib/platform/actions/paypalBilling";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async () => {
  const session = await getSession();
  await cancelOwnSubscription(session);
  return ok();
}));
