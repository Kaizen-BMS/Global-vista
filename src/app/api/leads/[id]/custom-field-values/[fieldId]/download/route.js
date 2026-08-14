import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getLeadCustomFieldFileUrl } from "@/lib/modules/crm/actions/leadCustomFields";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  if (!(await hasLeadCustomFieldsSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const { id, fieldId } = await ctx.params;
  const result = await getLeadCustomFieldFileUrl(session, id, fieldId);
  return ok(result);
});
