import { getSession } from "@/lib/auth";
import { ok, created, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { addComplaintComment } from "@/lib/actions/complaints";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  const body = await request.json();
  if (!body.comment) return badRequest("Comment is required.");
  const commentId = await addComplaintComment(session, id, { comment: body.comment, isInternal: !!body.isInternal }, session.id);
  return created({ id: commentId });
}));
