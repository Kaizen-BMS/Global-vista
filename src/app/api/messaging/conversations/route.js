import { getSession } from "@/lib/auth";
import { ok, created, badRequest, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { listConversations, getOrCreateDirectConversation, createGroupConversation, getOrCreateBroadcastConversation } from "@/lib/actions/messaging";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  const conversations = await listConversations(session);
  return ok({ conversations });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const body = await request.json();

  if (body.type === "direct") {
    if (!body.userId) return badRequest("userId is required.");
    const id = await getOrCreateDirectConversation(session, body.userId);
    return created({ id });
  }
  if (body.type === "group") {
    const id = await createGroupConversation(session, body.participantIds, body.title);
    return created({ id });
  }
  if (body.type === "broadcast") {
    const id = await getOrCreateBroadcastConversation(session);
    return created({ id });
  }
  return badRequest("Unknown conversation type.");
}));
