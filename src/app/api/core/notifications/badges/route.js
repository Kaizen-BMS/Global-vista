import { getSession } from "@/lib/auth";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { getSidebarBadgeCounts } from "@/lib/actions/notifications";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return forbidden();
  const badges = await getSidebarBadgeCounts(session);
  return ok(badges);
});
