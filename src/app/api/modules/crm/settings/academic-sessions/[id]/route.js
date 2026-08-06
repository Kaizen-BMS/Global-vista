import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { deleteAcademicSession } from "@/lib/actions/academicSessions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const DELETE = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "academic_sessions.manage"))) return forbidden();
  await deleteAcademicSession(id, session.id);
  return ok();
}));