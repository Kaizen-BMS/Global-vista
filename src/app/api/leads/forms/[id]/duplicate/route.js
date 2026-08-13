import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { created, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { duplicateLeadForm } from "@/lib/modules/crm/actions/leadForms";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();
  const { id } = await ctx.params;
  const newId = await duplicateLeadForm(session, id, session.id);
  return created({ id: newId });
}));
