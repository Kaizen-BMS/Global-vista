import { getSession } from "@/lib/auth";
import { canViewAllRecords } from "@/lib/modules/crm/rls";
import { ok, forbidden, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getSyncSource, updateSyncSource, deleteSyncSource } from "@/lib/actions/leadSync";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!canViewAllRecords(session)) return forbidden();
  const source = await getSyncSource(session, id);
  if (!source) return notFound();
  return ok({ source });
});

export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!canViewAllRecords(session)) return forbidden();
  const body = await request.json();
  await updateSyncSource(session, id, body, session.id);
  return ok();
}));

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!canViewAllRecords(session)) return forbidden();
  await deleteSyncSource(session, id, session.id);
  return ok();
}));
