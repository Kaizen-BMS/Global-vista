import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listLeadImportHistory } from "@/lib/modules/crm/actions/leadImport";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();
  return ok({ history: await listLeadImportHistory(session) });
});
