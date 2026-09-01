import { getSession } from "@/lib/auth";
import { ok, unauthorized, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { renameGroupConversation } from "@/lib/actions/messaging";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const { title } = await request.json();
  if (!title) return badRequest("title is required.");
  await renameGroupConversation(session, id, title);
  return ok();
}));
