import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getUserById } from "@/lib/actions/users";
import { getUserLoginHistory } from "@/lib/actions/loginHistory";
import { getActivityLogs } from "@/lib/activityLog";
import { listLeads } from "@/lib/actions/leads";
import ForbiddenState from "@/components/crm/shared/ForbiddenState";
import CrmNotFound from "@/app/crm/(protected)/not-found";
import EmployeeProfileTabs from "@/components/crm/users/EmployeeProfileTabs";

export default async function EmployeeProfilePage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!(await can(session, "users.view"))) return <ForbiddenState />;

  const user = await getUserById(id);
  if (!user) return <CrmNotFound />;

  const [loginHistory, allLogs, leadsResult] = await Promise.all([
    getUserLoginHistory(id, 20),
    getActivityLogs({ limit: 200 }),
    // Uses the viewing session's own RLS scope — an Admin/Super Admin
    // viewing this profile sees the employee's full assigned list; a
    // Counsellor viewing a colleague's profile (if permitted at all)
    // would only see leads within their own visibility, same as
    // everywhere else RLS is applied.
    can(session, "leads.view").then((allowed) =>
      allowed ? listLeads(session, { assignedTo: id, pageSize: 50 }) : { leads: [] }
    ),
  ]);
  const activity = allLogs.filter((log) => log.user_id === Number(id));

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-full bg-indigo-600/10 border border-indigo-600/30 flex items-center justify-center text-indigo-400 text-lg font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">{user.name}</h1>
          <p className="text-neutral-500 text-sm">{user.role_name} · {user.email}</p>
        </div>
      </div>

      <EmployeeProfileTabs user={user} loginHistory={loginHistory} activity={activity} assignedLeads={leadsResult.leads} />
    </div>
  );
}