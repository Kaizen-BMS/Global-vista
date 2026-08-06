import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { syncRolePermissions } from "@/lib/actions/roles";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "permissions.manage"))) return forbidden();
  const body = await request.json();
  await syncRolePermissions(session, id, Array.isArray(body.permissionIds) ? body.permissionIds : [], session.id);
  return ok();
}));