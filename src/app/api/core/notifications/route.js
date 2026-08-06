import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { getUserNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const unreadOnly = new URL(request.url).searchParams.get("unreadOnly") === "true";
  return ok({ notifications: await getUserNotifications(session, { unreadOnly }) });
});
export const PUT = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const body = await request.json().catch(() => ({}));
  if (body.id) await markNotificationRead(session, body.id);
  else await markAllNotificationsRead(session);
  return ok();
}));