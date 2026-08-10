import { getSession } from "@/lib/auth";
import { canViewAllRecords } from "@/lib/modules/crm/rls";
import { ok, forbidden, notFound, fail, withErrorHandling } from "@/lib/helpers/response";
import { getSyncSource, runSync } from "@/lib/actions/leadSync";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!canViewAllRecords(session)) return forbidden();
  const source = await getSyncSource(session, id);
  if (!source) return notFound();
  try {
    const result = await runSync(source);
    return ok({ result });
  } catch (err) {
    // A failed sync is a normal, expected outcome (bad credentials, sheet
    // not shared, etc.) — it's already recorded in lead_sync_runs by
    // runSync itself, so surface the real reason rather than a generic 500.
    return fail(err.message, err.status || 502);
  }
}));
