import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { listSubscriptionPayments } from "@/lib/platform/actions/subscriptionBilling";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  const payments = await listSubscriptionPayments(session);
  return ok({ payments });
});
