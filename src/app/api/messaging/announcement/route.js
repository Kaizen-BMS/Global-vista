import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { getLatestAnnouncement, dismissAnnouncement } from "@/lib/actions/messaging";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  const announcement = await getLatestAnnouncement(session);
  return ok({ announcement });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { conversationId } = await request.json();
  if (!conversationId) return badRequest("conversationId is required.");
  await dismissAnnouncement(session, conversationId);
  return ok();
}));
