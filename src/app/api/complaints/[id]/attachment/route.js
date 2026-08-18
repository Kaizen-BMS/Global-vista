import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getComplaintAttachmentUrl } from "@/lib/actions/complaints";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  const attachment = await getComplaintAttachmentUrl(session, id);
  return ok(attachment);
});
