import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listOrgRecords, createOrgRecord } from "@/lib/actions/orgSettings";
import { withCsrf } from "@/lib/helpers/withCsrf";

const PERM = { branches: "branches.manage", departments: "departments.manage", designations: "designations.manage", "employee-types": "employee_types.manage" };
export const GET = withErrorHandling(async (request, ctx) => {
  const { resource } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, PERM[resource] || "settings.manage"))) return forbidden();
  return ok({ records: await listOrgRecords(session, resource) });
});
export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const { resource } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, PERM[resource] || "settings.manage"))) return forbidden();
  const body = await request.json();
  if (!body.name) return badRequest("Name is required.");
  return created({ id: await createOrgRecord(session, resource, body, session.id) });
}));