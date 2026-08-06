import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getRoleById, getRolePermissionIds, getRoleAssignedUserCount, updateRole, deleteRole } from "@/lib/actions/roles";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return forbidden();
  return ok({ role: await getRoleById(session, id), permissionIds: await getRolePermissionIds(id), assignedUserCount: await getRoleAssignedUserCount(session, id) });
});
export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return forbidden();
  await updateRole(session, id, await request.json(), session.id);
  return ok();
}));
export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return forbidden();
  const reassignToRoleId = new URL(request.url).searchParams.get("reassignToRoleId");
  try { await deleteRole(session, id, session.id, reassignToRoleId); return ok(); }
  catch (e) { if (e.requiresReassignment) return badRequest(e.message, { requiresReassignment: true, assignedCount: e.assignedCount }); throw e; }
}));