import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { validate, roleValidators } from "@/lib/helpers/validation";
import { listRoles, createRole } from "@/lib/actions/roles";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return forbidden();
  return ok({ roles: await listRoles(session) });
});
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return forbidden();
  const body = await request.json();
  const { valid, errors } = validate(body, roleValidators);
  if (!valid) return badRequest("Validation failed.", { errors });
  return created({ id: await createRole(session, { ...body, createdBy: session.id }) });
}));