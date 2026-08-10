import { getSession } from "@/lib/auth";
import { assertSuperAdmin } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { removeUserRole, setDefaultUserRole } from "@/lib/actions/userRoles";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id, roleId } = await ctx.params;
  const session = await getSession();
  assertSuperAdmin(session);
  await removeUserRole(session, id, roleId, session.id);
  return ok();
}));

export const PATCH = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id, roleId } = await ctx.params;
  const session = await getSession();
  assertSuperAdmin(session);
  await setDefaultUserRole(session, id, roleId, session.id);
  return ok();
}));
