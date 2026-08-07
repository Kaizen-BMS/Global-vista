import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, notFound, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getLeadForm, updateLeadForm, deleteLeadForm } from "@/lib/modules/crm/actions/leadForms";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const { id } = await ctx.params;
  const form = await getLeadForm(session, id);
  if (!form) return notFound();
  return ok({ form });
});

export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  const { id } = await ctx.params;
  const body = await request.json();
  if (!body.name || !body.name.trim()) return badRequest("Form name is required.");
  if (!body.defaultLeadSourceId || !body.defaultServiceId) return badRequest("A default Lead Source and Service are required.");
  await updateLeadForm(session, id, body, session.id);
  return ok();
}));

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.delete"))) return forbidden();
  const { id } = await ctx.params;
  await deleteLeadForm(session, id, session.id);
  return ok();
}));
