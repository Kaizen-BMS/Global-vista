import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { updateMessage } from "@/lib/actions/messaging";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PATCH = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id, messageId } = await ctx.params;
  const { body } = await request.json();
  if (!body?.trim()) return badRequest("Message can't be empty.");
  await updateMessage(session, id, messageId, body);
  return ok();
}));
