import { getSession } from "@/lib/auth";
import { can, isSuperAdmin } from "@/lib/helpers/permissions";
import { listUsers } from "@/lib/actions/users";
import { listRoles } from "@/lib/actions/roles";
import UserFilters from "@/components/users/UserFilters";
import UsersTable from "@/components/users/UsersTable";
import Pagination from "@/components/shared/Pagination";
import ForbiddenState from "@/components/shared/ForbiddenState";

export default async function UsersPage({ searchParams }) {
  const session = await getSession();
  if (!(await can(session, "users.view"))) return <ForbiddenState />;
  const sp = await searchParams;
  const [result, roles, canManage, canUnlock] = await Promise.all([
    listUsers(session, { status: sp.status, roleId: sp.roleId, search: sp.search, page: sp.page || 1 }),
    listRoles(session), can(session, "users.manage"), can(session, "users.unlock"),
  ]);
  return (
    <div>
      <div className="mb-6"><h1 className="text-xl font-semibold text-white">Users</h1><p className="text-neutral-500 text-sm">{result.total} total</p></div>
      <UserFilters roles={roles} canManage={canManage} />
      <UsersTable users={result.users} roles={roles} canManage={canManage} canUnlock={canUnlock} isSuperAdmin={isSuperAdmin(session)} />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </div>
  );
}