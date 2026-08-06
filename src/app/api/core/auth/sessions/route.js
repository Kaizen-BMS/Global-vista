import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { listUserSessions, terminateSession, logoutAllDevices } from "@/lib/actions/sessions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  return ok({ sessions: await listUserSessions(session.id, session.jti) });
});
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const body = await request.json();
  if (body.action === "terminate") { await terminateSession(body.sessionId, session.id); return ok(); }
  if (body.action === "logout_all") { await logoutAllDevices(session.id, session.jti, session.id, session.company_id); return ok(); }
  return ok();
}));