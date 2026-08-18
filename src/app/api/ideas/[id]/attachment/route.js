import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getIdeaAttachmentUrl } from "@/lib/actions/ideas";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  const attachment = await getIdeaAttachmentUrl(session, id);
  return ok(attachment);
});
