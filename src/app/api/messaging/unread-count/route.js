import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { getUnreadMessageCount } from "@/lib/actions/messaging";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  const unread = await getUnreadMessageCount(session);
  return ok({ unread });
});
