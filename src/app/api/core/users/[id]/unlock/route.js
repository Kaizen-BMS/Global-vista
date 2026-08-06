import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { clearFailedLogins } from "@/lib/actions/accountLockout";
import { logActivity } from "@/lib/activityLog";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "users.unlock"))) return forbidden();
  await clearFailedLogins(id);
  await logActivity({ userId: session.id, module: "users", action: "unlock", entityType: "user", entityId: id, description: `Unlocked #${id}`, companyId: session.company_id });
  return ok();
}));