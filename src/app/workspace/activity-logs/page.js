import { getSession } from "@/lib/auth";
import { getActivityLogs } from "@/lib/activityLog";

export default async function ActivityLogsPage() {
  const session = await getSession();
  const logs = await getActivityLogs({ limit: 100, companyId: session.company_id });
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-6">Activity Logs</h1>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
        {logs.map((l) => <div key={l.id} className="px-4 py-3 flex justify-between"><p className="text-white text-sm"><span className="text-indigo-400">{l.user_name || "System"}</span> {l.description}</p><span className="text-neutral-500 text-xs">{new Date(l.created_at).toLocaleString()}</span></div>)}
      </div>
    </div>
  );
}