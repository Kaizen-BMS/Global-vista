import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getLeadById, updateLead, updateLeadStage, updateLeadStatus, deleteLead } from "@/lib/actions/leads";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const lead = await getLeadById(session, id);
  if (!lead) return notFound();
  return ok({ lead });
});

export const PUT = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  const body = await request.json();
  if (body.stage) await updateLeadStage(session, id, body.stage, session.id);
  if (body.status) await updateLeadStatus(session, id, body.status, session.id);
  const { stage, status, ...rest } = body;
  if (Object.keys(rest).length) await updateLead(session, id, rest, session.id);
  return ok();
}));

export const DELETE = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.delete"))) return forbidden();
  await deleteLead(session, id, session.id);
  return ok();
}));