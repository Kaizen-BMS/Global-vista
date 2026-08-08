import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getUserById, getUserLoginHistory } from "@/lib/actions/users";
import { getActivityLogs } from "@/lib/activityLog";
import ForbiddenState from "@/components/shared/ForbiddenState";
import EmployeeProfileTabs from "@/components/users/EmployeeProfileTabs";

export default async function EmployeeProfilePage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!(await can(session, "users.view"))) return <ForbiddenState />;
  const user = await getUserById(session, id);
  if (!user) return <div className="text-muted-foreground text-sm">Not found.</div>;
  const [loginHistory, allLogs] = await Promise.all([getUserLoginHistory(session, id, 20), getActivityLogs({ limit: 200, companyId: session.company_id })]);
  const activity = allLogs.filter((l) => l.user_id === Number(id));
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-full bg-indigo-600/10 border border-indigo-600/30 flex items-center justify-center text-indigo-400 text-lg font-semibold">{user.name.charAt(0).toUpperCase()}</div>
        <div><h1 className="text-xl font-semibold text-foreground">{user.name}</h1><p className="text-muted-foreground text-sm">{user.role_name} · {user.email}</p></div>
      </div>
      <EmployeeProfileTabs user={user} loginHistory={loginHistory} activity={activity} isSelf={session.id === Number(id)} />
    </div>
  );
}