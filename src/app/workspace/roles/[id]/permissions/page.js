import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getRoleById, getRolePermissionIds, listPermissions } from "@/lib/actions/roles";
import PermissionMatrix from "@/components/roles/PermissionMatrix";
import ForbiddenState from "@/components/shared/ForbiddenState";

// Permissions whose entire corresponding settings area is already hidden
// for schools (Organization Structure's 4 sections, Employee Document
// Types) — leaving these toggleable here would be confusing busywork for
// a feature a school admin can never actually reach.
const CHILD_COMPANY_HIDDEN_PERMISSION_SLUGS = new Set([
  "branches.manage", "departments.manage", "designations.manage", "employee_types.manage", "employee_documents.manage",
]);

export default async function RolePermissionsPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!(await can(session, "permissions.manage"))) return <ForbiddenState />;
  const [role, permissions, assignedIds] = await Promise.all([getRoleById(session, id), listPermissions(), getRolePermissionIds(id)]);
  if (!role) return <div className="text-muted-foreground text-sm">Not found.</div>;
  const visiblePermissions = session.is_child_company ? permissions.filter((p) => !CHILD_COMPANY_HIDDEN_PERMISSION_SLUGS.has(p.slug)) : permissions;
  return (
    <div>
      <div className="mb-6"><h1 className="text-xl font-semibold text-foreground">{role.name}</h1></div>
      <PermissionMatrix roleId={role.id} allPermissions={visiblePermissions} assignedIds={assignedIds} />
    </div>
  );
}