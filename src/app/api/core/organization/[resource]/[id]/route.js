import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { deleteOrgRecord } from "@/lib/actions/orgSettings";
import { withCsrf } from "@/lib/helpers/withCsrf";

const PERM = { branches: "branches.manage", departments: "departments.manage", designations: "designations.manage", "employee-types": "employee_types.manage" };
export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const { resource, id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, PERM[resource] || "settings.manage"))) return forbidden();
  await deleteOrgRecord(session, resource, id, session.id);
  return ok();
}));