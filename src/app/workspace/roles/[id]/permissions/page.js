import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getRoleById, getRolePermissionIds, listPermissions } from "@/lib/actions/roles";
import PermissionMatrix from "@/components/roles/PermissionMatrix";
import ForbiddenState from "@/components/shared/ForbiddenState";

export default async function RolePermissionsPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!(await can(session, "permissions.manage"))) return <ForbiddenState />;
  const [role, permissions, assignedIds] = await Promise.all([getRoleById(session, id), listPermissions(), getRolePermissionIds(id)]);
  if (!role) return <div className="text-muted-foreground text-sm">Not found.</div>;
  return (
    <div>
      <div className="mb-6"><h1 className="text-xl font-semibold text-foreground">{role.name}</h1></div>
      <PermissionMatrix roleId={role.id} allPermissions={permissions} assignedIds={assignedIds} />
    </div>
  );
}