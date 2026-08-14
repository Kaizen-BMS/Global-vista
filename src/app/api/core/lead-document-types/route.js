import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeadDocumentTypes, createLeadDocumentType } from "@/lib/modules/crm/actions/leadDocumentTypes";
import { hasLeadDocumentTypesSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadDocumentTypesSchema())) return ok({ types: [], schemaReady: false });
  return ok({ types: await listLeadDocumentTypes(session), schemaReady: true });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadDocumentTypesSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const body = await request.json();
  const id = await createLeadDocumentType(session, body, session.id);
  return created({ id });
}));
