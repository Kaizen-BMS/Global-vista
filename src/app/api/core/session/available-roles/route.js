import { getSession } from "@/lib/auth";
import { isSuperAdminAccount } from "@/lib/helpers/permissions";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { pool } from "@/lib/db";

// What the Role Switcher itself is allowed to offer — distinct from
// /api/core/users/[id]/roles, which is about managing SOMEONE ELSE's
// assignments and requires actively acting as Super Admin. This one
// always uses the permanent account flag for the Super Admin branch, so
// switching your own role never locks you out of switching again.
export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();

  if (isSuperAdminAccount(session)) {
    const [rows] = await pool.query(
      `SELECT id AS role_id, name, slug FROM roles WHERE company_id = ? AND is_deleted = 0 AND status = 'active' ORDER BY name`,
      [session.company_id]
    );
    return ok({ roles: rows, scope: "company" });
  }

  const [rows] = await pool.query(
    `SELECT ur.role_id, r.name, r.slug FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.is_deleted = 0 AND r.status = 'active' ORDER BY r.name`,
    [session.id]
  );
  return ok({ roles: rows, scope: "assigned" });
});
