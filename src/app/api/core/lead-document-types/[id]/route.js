import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { updateLeadDocumentType, deleteLeadDocumentType } from "@/lib/modules/crm/actions/leadDocumentTypes";
import { hasLeadDocumentTypesSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadDocumentTypesSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const { id } = await ctx.params;
  const body = await request.json();
  await updateLeadDocumentType(session, id, body, session.id);
  return ok();
}));

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadDocumentTypesSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const { id } = await ctx.params;
  await deleteLeadDocumentType(session, id, session.id);
  return ok();
}));
