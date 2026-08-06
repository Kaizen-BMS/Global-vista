import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { deleteAcademicSession } from "@/lib/actions/academicSessions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "academic_sessions.manage"))) return forbidden();
  await deleteAcademicSession(session, id, session.id);
  return ok();
}));