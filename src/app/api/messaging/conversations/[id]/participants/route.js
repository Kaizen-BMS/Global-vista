import { getSession } from "@/lib/auth";
import { ok, unauthorized, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getConversationParticipants, addGroupParticipants, removeGroupParticipant } from "@/lib/actions/messaging";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const participants = await getConversationParticipants(session, id);
  return ok({ participants });
});

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const { userIds } = await request.json();
  if (!Array.isArray(userIds) || !userIds.length) return badRequest("userIds is required.");
  await addGroupParticipants(session, id, userIds);
  return ok();
}));

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const { userId } = await request.json();
  if (!userId) return badRequest("userId is required.");
  await removeGroupParticipant(session, id, userId);
  return ok();
}));
