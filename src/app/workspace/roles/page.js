import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listRoles } from "@/lib/actions/roles";
import RoleList from "@/components/roles/RoleList";
import ForbiddenState from "@/components/shared/ForbiddenState";

export default async function RolesPage() {
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return <ForbiddenState />;
  return (
    <div>
      <div className="mb-6"><h1 className="text-xl font-semibold text-white">Roles</h1></div>
      <RoleList roles={await listRoles(session)} />
    </div>
  );
}