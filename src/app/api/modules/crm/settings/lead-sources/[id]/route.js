import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { deleteLeadSource } from "@/lib/actions/leadMeta";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const DELETE = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "lead_sources.manage"))) return forbidden();
  await deleteLeadSource(id, session.id);
  return ok();
}));