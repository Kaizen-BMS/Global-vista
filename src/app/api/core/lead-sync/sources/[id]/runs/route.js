import { getSession } from "@/lib/auth";
import { canViewAllRecords } from "@/lib/modules/crm/rls";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listSyncRuns } from "@/lib/actions/leadSync";

export const GET = withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!canViewAllRecords(session)) return forbidden();
  const runs = await listSyncRuns(session, id);
  return ok({ runs });
});
