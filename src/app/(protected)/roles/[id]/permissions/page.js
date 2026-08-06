import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getRoleById, getRolePermissionIds, listPermissions } from "@/lib/actions/roles";
import PermissionMatrix from "@/components/crm/roles/PermissionMatrix";
import ForbiddenState from "@/components/crm/shared/ForbiddenState";
import CrmNotFound from "@/app/crm/(protected)/not-found";

export default async function RolePermissionsPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!(await can(session, "permissions.manage"))) return <ForbiddenState />;

  const [role, permissions, assignedIds] = await Promise.all([
    getRoleById(id),
    listPermissions(),
    getRolePermissionIds(id),
  ]);

  if (!role) return <CrmNotFound />;

  return (
    <div>
      <div className="mb-6">
        <p className="text-neutral-500 text-xs mb-1">Role Permissions</p>
        <h1 className="text-xl font-semibold text-white">{role.name}</h1>
        {role.is_system && <p className="text-indigo-400 text-xs mt-1">System role</p>}
      </div>
      <PermissionMatrix roleId={role.id} allPermissions={permissions} assignedIds={assignedIds} />
    </div>
  );
}