import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { uploadLeadCustomFieldFile } from "@/lib/modules/crm/actions/leadCustomFields";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  if (!(await hasLeadCustomFieldsSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const { id, fieldId } = await ctx.params;
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") return badRequest("No file provided.");
  const result = await uploadLeadCustomFieldFile(session, id, fieldId, file, session.id);
  return created(result);
}));
