import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/actions/users";
import { getUserLoginHistory } from "@/lib/actions/loginHistory";
import SessionsPanel from "@/components/crm/profile/SessionsPanel";

export default async function ProfilePage() {
  const session = await getSession();
  const user = await getUserById(session.id);
  const loginHistory = await getUserLoginHistory(session.id, 10);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-indigo-600/10 border border-indigo-600/30 flex items-center justify-center text-indigo-400 text-xl font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">{user.name}</h1>
          <p className="text-neutral-500 text-sm">{user.role_name} · {user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <InfoBlock label="Employee ID" value={user.employee_id || "—"} />
        <InfoBlock label="Branch" value={user.branch_name || "—"} />
        <InfoBlock label="Department" value={user.department_name || "—"} />
        <InfoBlock label="Designation" value={user.designation_name || "—"} />
        <InfoBlock label="Manager" value={user.manager_name || "—"} />
        <InfoBlock label="Last Login" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "—"} />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <SessionsPanel />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <p className="text-white font-medium mb-4">Recent Login Activity</p>
        <div className="space-y-2">
          {loginHistory.length === 0 && <p className="text-neutral-500 text-sm">No login history yet.</p>}
          {loginHistory.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-sm">
              <span className="text-neutral-300 capitalize">{entry.event.replace("_", " ")}</span>
              <span className="text-neutral-500 text-xs">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <a href="/crm/change-password" className="inline-block text-sm text-indigo-400 hover:text-indigo-300">
        Change Password
      </a>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <p className="text-neutral-500 text-xs mb-0.5">{label}</p>
      <p className="text-white text-sm truncate">{value}</p>
    </div>
  );
}