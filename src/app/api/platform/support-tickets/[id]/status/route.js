import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { updateTicketStatus } from "@/lib/platform/actions/supportTickets";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const body = await request.json();
  if (!body.status && !body.priority && !body.assignToSelf) return badRequest("Nothing to update.");
  await updateTicketStatus(session, id, body, session.id);
  return ok();
}));
