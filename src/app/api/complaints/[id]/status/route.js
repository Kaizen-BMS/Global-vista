import { getSession } from "@/lib/auth";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { updateComplaintStatus } from "@/lib/actions/complaints";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  const body = await request.json();
  if (!body.status && !body.priority && body.assignedReviewerId === undefined) return badRequest("Nothing to update.");
  await updateComplaintStatus(session, id, { status: body.status, priority: body.priority, assignedReviewerId: body.assignedReviewerId }, session.id);
  return ok();
}));
