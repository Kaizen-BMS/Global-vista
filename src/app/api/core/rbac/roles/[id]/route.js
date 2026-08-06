import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getRoleById, getRolePermissionIds, getRoleAssignedUserCount, updateRole, deleteRole } from "@/lib/actions/roles";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return forbidden();
  const role = await getRoleById(id);
  const permissionIds = await getRolePermissionIds(id);
  const assignedUserCount = await getRoleAssignedUserCount(id);
  return ok({ role, permissionIds, assignedUserCount });
});

export const PUT = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return forbidden();
  const body = await request.json();
  await updateRole(id, body, session.id);
  return ok();
}));

export const DELETE = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const reassignToRoleId = searchParams.get("reassignToRoleId");

  try {
    await deleteRole(id, session.id, reassignToRoleId);
    return ok();
  } catch (err) {
    if (err.requiresReassignment) {
      return badRequest(err.message, { requiresReassignment: true, assignedCount: err.assignedCount });
    }
    throw err;
  }
}));