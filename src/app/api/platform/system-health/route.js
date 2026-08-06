import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getSystemHealth } from "@/lib/platform/actions/systemHealth";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertPlatformOperator(session);
  return ok(await getSystemHealth());
});