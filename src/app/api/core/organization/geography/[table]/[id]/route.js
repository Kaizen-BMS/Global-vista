import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { deleteGeoRecord } from "@/lib/actions/geography";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const { table, id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  await deleteGeoRecord(table, id, session.id);
  return ok();
}));