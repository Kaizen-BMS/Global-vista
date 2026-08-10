import { getSession } from "@/lib/auth";
import { assertSuperAdmin } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listUserRoles, assignUserRole } from "@/lib/actions/userRoles";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  // Self can see own assigned roles (needed for the role switcher);
  // viewing someone else's requires Super Admin.
  if (Number(id) !== session?.id) assertSuperAdmin(session);
  const roles = await listUserRoles(session, id);
  return ok({ roles });
});

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  assertSuperAdmin(session);
  const body = await request.json();
  if (!body.roleId) return badRequest("roleId is required.");
  await assignUserRole(session, id, body.roleId, session.id);
  return ok();
}));
