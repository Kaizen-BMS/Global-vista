import { getSession } from "@/lib/auth";
import { ok, created, badRequest, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { addCompanyTicketComment } from "@/lib/platform/actions/supportTickets";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const { comment } = await request.json();
  if (!comment?.trim()) return badRequest("Comment is required.");
  const commentId = await addCompanyTicketComment(session, id, comment, session.id);
  return created({ id: commentId });
}));
