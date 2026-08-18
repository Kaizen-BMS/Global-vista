import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { updateFieldSection, deleteFieldSection } from "@/lib/modules/crm/actions/leadFieldLayout";
import { hasLeadFormBuilderSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadFormBuilderSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const body = await request.json();
  await updateFieldSection(session, id, body, session.id);
  return ok();
}));

export const DELETE = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadFormBuilderSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  await deleteFieldSection(session, id, session.id);
  return ok();
}));
