import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listPermissions } from "@/lib/actions/roles";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return forbidden();
  return ok({ permissions: await listPermissions() });
});