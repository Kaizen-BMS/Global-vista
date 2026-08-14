import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeadCustomFields, createLeadCustomField } from "@/lib/modules/crm/actions/leadCustomFields";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadCustomFieldsSchema())) return ok({ fields: [], schemaReady: false });
  return ok({ fields: await listLeadCustomFields(session), schemaReady: true });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadCustomFieldsSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const body = await request.json();
  const id = await createLeadCustomField(session, body, session.id);
  return created({ id });
}));
