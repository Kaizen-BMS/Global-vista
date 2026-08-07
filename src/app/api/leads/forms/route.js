import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeadForms, createLeadForm } from "@/lib/modules/crm/actions/leadForms";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  return ok({ forms: await listLeadForms(session) });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();
  const body = await request.json();
  if (!body.name || !body.name.trim()) return badRequest("Form name is required.");
  if (!body.defaultLeadSourceId || !body.defaultServiceId) return badRequest("A default Lead Source and Service are required.");
  const id = await createLeadForm(session, body, session.id);
  return created({ id });
}));
