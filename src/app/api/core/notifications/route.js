import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { getUserNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { withCsrf } from "@/lib/helpers/withCsrf";
import { isCompanySuspended } from "@/lib/helpers/permissions";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  if (isCompanySuspended(session)) return forbidden("Your company account has been suspended.");
  const params = new URL(request.url).searchParams;
  const unreadOnly = params.get("unreadOnly") === "true";
  const limit = Math.min(Number(params.get("limit")) || 20, 100);
  return ok({ notifications: await getUserNotifications(session, { unreadOnly, limit }) });
});
export const PUT = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  if (isCompanySuspended(session)) return forbidden("Your company account has been suspended.");
  const body = await request.json().catch(() => ({}));
  if (body.id) await markNotificationRead(session, body.id);
  else await markAllNotificationsRead(session);
  return ok();
}));