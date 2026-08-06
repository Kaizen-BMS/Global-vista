import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { deleteFilter } from "@/lib/modules/crm/actions/savedFilters";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const { slug } = await ctx.params;
  await deleteFilter(session, slug);
  return ok();
}));
