import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listUsers } from "@/lib/actions/users";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "users.view"))) return forbidden();
  const { users } = await listUsers(session, { pageSize: 1000 });
  const csv = [["Name", "Email", "Phone", "Role", "Status"], ...users.map((u) => [u.name, u.email, u.phone || "", u.role_name, u.status])]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="users.csv"` } });
});