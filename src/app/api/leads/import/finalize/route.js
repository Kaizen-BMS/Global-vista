import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { recordLeadImportHistory } from "@/lib/modules/crm/actions/leadImport";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();

  const body = await request.json();
  if (!body.fileName) return badRequest("fileName is required.");

  const historyId = await recordLeadImportHistory(session, { ...body, importedBy: session.id });
  return ok({ historyId });
}));
