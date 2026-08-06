import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listRoles } from "@/lib/actions/roles";
import RoleList from "@/components/crm/roles/RoleList";
import ForbiddenState from "@/components/crm/shared/ForbiddenState";

export default async function RolesPage() {
  const session = await getSession();
  if (!(await can(session, "roles.manage"))) return <ForbiddenState />;

  const roles = await listRoles();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Roles</h1>
        <p className="text-neutral-500 text-sm">Manage roles and their permissions</p>
      </div>
      <RoleList roles={roles} />
    </div>
  );
}