import { getSession } from "@/lib/auth";
import { ok, unauthorized, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getUserNotificationPreferences, setUserNotificationPreference } from "@/lib/actions/notifications";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  return ok({ preferences: await getUserNotificationPreferences(session) });
});

export const PUT = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { category, enabled } = await request.json();
  if (!category) return badRequest("category is required.");
  await setUserNotificationPreference(session, category, !!enabled);
  return ok();
}));
