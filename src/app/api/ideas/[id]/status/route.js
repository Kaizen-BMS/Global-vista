import { getSession } from "@/lib/auth";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { updateIdeaStatus } from "@/lib/actions/ideas";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  const body = await request.json();
  if (!body.status && !body.priority && body.assignedTo === undefined) return badRequest("Nothing to update.");
  await updateIdeaStatus(session, id, { status: body.status, priority: body.priority, assignedTo: body.assignedTo, rejectionReason: body.rejectionReason }, session.id);
  return ok();
}));
