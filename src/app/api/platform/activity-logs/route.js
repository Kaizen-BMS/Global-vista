import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getActivityLogs } from "@/lib/activityLog";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertPlatformOperator(session);
  return ok({ logs: await getActivityLogs({ module: "platform", limit: 100 }) });
});