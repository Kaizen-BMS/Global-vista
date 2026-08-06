import { getSession } from "@/lib/auth";
import { can, assertSuperAdmin } from "@/lib/helpers/permissions";
import { ok, forbidden, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getUserById, updateUser, deleteUser, restoreUser, setUserStatus, resetUserPassword } from "@/lib/actions/users";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "users.view"))) return forbidden();
  const user = await getUserById(session, id);
  if (!user) return notFound();
  return ok({ user });
});

export const PUT = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  const body = await request.json();

  if (body.action === "restore") {
    assertSuperAdmin(session);
    await restoreUser(session, id, session.id);
    return ok();
  }
  if (!(await can(session, "users.manage"))) return forbidden();
  if (body.action === "set_status") { await setUserStatus(session, id, body.status, session.id); return ok(); }
  if (body.action === "reset_password") { await resetUserPassword(session, id, body.newPassword, session.id); return ok(); }
  const user = await updateUser(session, id, body, session.id);
  return ok({ user });
}));

export const DELETE = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  assertSuperAdmin(session);
  await deleteUser(session, id, session.id);
  return ok();
}));