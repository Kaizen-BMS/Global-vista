import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { reorderFieldSections } from "@/lib/modules/crm/actions/leadFieldLayout";
import { hasLeadFormBuilderSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadFormBuilderSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const body = await request.json();
  if (!Array.isArray(body.orderedIds)) return badRequest("orderedIds must be an array.");
  await reorderFieldSections(session, body.orderedIds, session.id);
  return ok();
}));
