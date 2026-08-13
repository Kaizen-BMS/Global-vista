import { ok, withErrorHandling } from "@/lib/helpers/response";
import { listPublicPlans } from "@/lib/platform/actions/registration";

export const GET = withErrorHandling(async () => {
  const plans = await listPublicPlans();
  return ok({ plans });
});
