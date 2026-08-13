import { getSession } from "@/lib/auth";
import { can, isSuperAdmin } from "@/lib/helpers/permissions";
import { ok, forbidden, notFound, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getLeadForm, updateLeadForm, deleteLeadForm } from "@/lib/modules/crm/actions/leadForms";
import { withCsrf } from "@/lib/helpers/withCsrf";

// Ownership check happens here, server-side, against the form row actually
// stored in the DB — never trust a client's belief about who owns a form.
// Only the creator or a Company Super Admin may mutate it; every other user
// with leads.update/leads.delete can still use, view, and share the form,
// just not edit or remove it.
function assertOwnerOrSuperAdmin(session, form) {
  if (isSuperAdmin(session)) return;
  if (form.created_by && Number(form.created_by) === Number(session.id)) return;
  const e = new Error("Only the form's creator or a Super Admin can modify this Query Form.");
  e.status = 403;
  throw e;
}

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
  const existing = await getLeadForm(session, id);
  if (!existing) return notFound();
  assertOwnerOrSuperAdmin(session, existing);
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
  const existing = await getLeadForm(session, id);
  if (!existing) return notFound();
  assertOwnerOrSuperAdmin(session, existing);
  await deleteLeadForm(session, id, session.id);
  return ok();
}));
