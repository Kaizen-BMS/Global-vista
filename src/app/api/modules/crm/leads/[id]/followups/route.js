import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeadFollowups, createFollowup, completeFollowup } from "@/lib/actions/leadFollowups";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const followups = await listLeadFollowups(id);
  return ok({ followups });
});

export const POST = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.followups.manage"))) return forbidden();
  const body = await request.json();

  if (body.action === "complete") {
    if (!body.followupId) return badRequest("followupId is required.");
    await completeFollowup(body.followupId, id, body, session.id);
    return ok();
  }

  if (!body.type || !body.scheduledAt) return badRequest("Type and scheduled time are required.");
  const followupId = await createFollowup(id, body, session.id);
  return created({ id: followupId });
});