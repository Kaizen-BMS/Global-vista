import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getLeadFormAnalytics } from "@/lib/modules/crm/actions/leadForms";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const { id } = await ctx.params;
  const analytics = await getLeadFormAnalytics(session, id);
  if (!analytics) return notFound();
  return ok(analytics);
});
