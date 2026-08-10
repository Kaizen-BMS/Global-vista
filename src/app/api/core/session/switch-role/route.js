import { getSession, reissueSessionWithRole } from "@/lib/auth";
import { ok, unauthorized, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { switchActiveRole } from "@/lib/actions/userRoles";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const body = await request.json();
  if (!body.roleId) return badRequest("roleId is required.");
  // switchActiveRole re-validates roleId against this user's own
  // user_roles rows — the client's roleId is never trusted on its own.
  const result = await switchActiveRole(session, body.roleId);
  await reissueSessionWithRole(session, result.roleId, result.roleSlug);
  return ok({ role: result });
}));
