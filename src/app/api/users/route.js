import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { validate, userValidators } from "@/lib/helpers/validation";
import { listUsers, createUser, bulkSetUserStatus, bulkAssignRole } from "@/lib/actions/users";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "users.view"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const result = await listUsers(session, {
    status: searchParams.get("status") || null,
    roleId: searchParams.get("roleId") || null,
    search: searchParams.get("search") || null,
    includeDeleted: searchParams.get("includeDeleted") === "true",
    sort: searchParams.get("sort") || "created_at",
    dir: searchParams.get("dir") || "DESC",
    page: searchParams.get("page") || 1,
    pageSize: searchParams.get("pageSize") || 20,
  });
  return ok(result);
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  const body = await request.json();

  if (body.bulkAction) {
    if (!(await can(session, "users.manage"))) return forbidden();
    if (body.bulkAction === "status") await bulkSetUserStatus(session, body.ids || [], body.status, session.id);
    else if (body.bulkAction === "role") await bulkAssignRole(session, body.ids || [], body.roleId, session.id);
    return ok();
  }

  if (!(await can(session, "users.manage"))) return forbidden();
  const { valid, errors } = validate(body, userValidators);
  if (!valid) return badRequest("Validation failed.", { errors });
  const user = await createUser(session, body, session.id);
  return created({ user });
}));