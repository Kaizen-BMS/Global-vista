import { getSession } from "@/lib/auth";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { getNotificationBadges } from "@/lib/actions/notifications";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return forbidden();
  const badges = await getNotificationBadges(session);
  return ok(badges);
});
