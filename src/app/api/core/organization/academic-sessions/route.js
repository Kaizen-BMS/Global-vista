import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listAcademicSessions, createAcademicSession } from "@/lib/actions/academicSessions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "academic_sessions.manage"))) return forbidden();
  return ok({ sessions: await listAcademicSessions(session) });
});
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "academic_sessions.manage"))) return forbidden();
  const body = await request.json();
  if (!body.name || !body.startDate || !body.endDate) return badRequest("Name, startDate, endDate required.");
  return created({ id: await createAcademicSession(session, body, session.id) });
}));