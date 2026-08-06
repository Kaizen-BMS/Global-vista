import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listAcademicSessions, createAcademicSession } from "@/lib/actions/academicSessions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "academic_sessions.manage"))) return forbidden();
  const sessions = await listAcademicSessions();
  return ok({ sessions });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "academic_sessions.manage"))) return forbidden();
  const body = await request.json();
  if (!body.name || !body.startDate || !body.endDate) return badRequest("Name, start date, and end date are required.");
  const id = await createAcademicSession(body, session.id);
  return created({ id });
}));