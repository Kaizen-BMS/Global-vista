import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { getConversationParticipants } from "@/lib/actions/messaging";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const participants = await getConversationParticipants(session, id);
  return ok({ participants });
});
