import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listSavedFilters, saveFilter } from "@/lib/modules/crm/actions/savedFilters";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  return ok({ filters: await listSavedFilters(session) });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const body = await request.json();
  if (!body.name || !body.name.trim()) return badRequest("Filter name is required.");
  const slug = await saveFilter(session, body.name, body.params || {});
  return created({ slug });
}));
