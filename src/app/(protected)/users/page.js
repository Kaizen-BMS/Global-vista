import Link from "next/link";
import { getSession } from "@/lib/auth";
import { can, isSuperAdmin } from "@/lib/helpers/permissions";
import { listUsers } from "@/lib/actions/users";
import { listRoles } from "@/lib/actions/roles";
import { listOrgRecords } from "@/lib/actions/orgSettings";
import UserFilters from "@/components/crm/users/UserFilters";
import UsersTable from "@/components/crm/users/UsersTable";
import Pagination from "@/components/crm/shared/Pagination";
import ForbiddenState from "@/components/crm/shared/ForbiddenState";
import { Archive } from "lucide-react";

export default async function UsersPage({ searchParams }) {
  const session = await getSession();
  if (!(await can(session, "users.view"))) return <ForbiddenState />;

  const sp = await searchParams;
  const viewingDeleted = sp.deleted === "1";
  const superAdmin = isSuperAdmin(session);

  const [result, roles, branches, departments, designations, employeeTypes, canManage, canImport, canUnlock] = await Promise.all([
    listUsers({
      status: sp.status || null,
      roleId: sp.roleId || null,
      search: sp.search || null,
      includeDeleted: viewingDeleted,
      sort: sp.sort || "created_at",
      dir: sp.dir || "DESC",
      page: sp.page || 1,
    }),
    listRoles(),
    listOrgRecords("branches"),
    listOrgRecords("departments"),
    listOrgRecords("designations"),
    listOrgRecords("employee-types"),
    can(session, "users.manage"),
    can(session, "users.import"),
    can(session, "users.unlock"),
  ]);

  const managers = result.users.filter((u) => ["admin", "management"].includes(u.role_slug) || u.is_super_admin);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">
            {viewingDeleted ? "Deleted Users" : "Users"}
          </h1>
          <p className="text-neutral-500 text-sm">{result.total} {viewingDeleted ? "deleted" : "total"} employees</p>
        </div>
        <div className="flex items-center gap-2">
          {superAdmin && (
            <Link
              href={viewingDeleted ? "/crm/users" : "/crm/users?deleted=1"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-sm transition"
            >
              <Archive className="h-4 w-4" />
              {viewingDeleted ? "Back to Users" : "Deleted Users"}
            </Link>
          )}
          {!viewingDeleted && (
            <a
              href="/api/users/export"
              className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-sm transition"
            >
              Export
            </a>
          )}
        </div>
      </div>

      {!viewingDeleted && (
        <UserFilters
          roles={roles}
          branches={branches}
          departments={departments}
          designations={designations}
          employeeTypes={employeeTypes}
          managers={managers}
          canManage={canManage}
          canImport={canImport}
        />
      )}
      <UsersTable users={result.users} roles={roles} canManage={canManage} canUnlock={canUnlock} isSuperAdmin={superAdmin} viewingDeleted={viewingDeleted} />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </div>
  );
}