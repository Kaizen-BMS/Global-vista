import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { reorderLeadDocumentTypes } from "@/lib/modules/crm/actions/leadDocumentTypes";
import { hasLeadDocumentTypesSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadDocumentTypesSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const { orderedIds } = await request.json();
  await reorderLeadDocumentTypes(session, orderedIds, session.id);
  return ok();
}));
