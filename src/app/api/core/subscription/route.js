import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getSubscriptionDetails } from "@/lib/platform/tenant";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  const subscription = await getSubscriptionDetails(session.company_id);
  return ok({ subscription });
});
