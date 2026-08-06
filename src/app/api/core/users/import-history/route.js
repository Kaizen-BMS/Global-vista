import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listImportHistory } from "@/lib/core/actions/userImport";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "users.import"))) return forbidden();
  const history = await listImportHistory();
  return ok({ history });
});