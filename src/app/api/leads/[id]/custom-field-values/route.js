import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getLeadCustomFieldValues, saveLeadCustomFieldValues } from "@/lib/modules/crm/actions/leadCustomFields";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const { id } = await ctx.params;
  if (!(await hasLeadCustomFieldsSchema())) return ok({ values: [] });
  return ok({ values: await getLeadCustomFieldValues(session, id) });
});

export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  const { id } = await ctx.params;
  if (!(await hasLeadCustomFieldsSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const { values } = await request.json();
  await saveLeadCustomFieldValues(session, id, values || {}, session.id, { context: "lead_form" });
  return ok();
}));
