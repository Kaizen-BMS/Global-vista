import { getActivityLogs } from "@/lib/activityLog";

export default async function ActivityLogsPage() {
  const logs = await getActivityLogs({ limit: 100 });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Activity Logs</h1>
        <p className="text-neutral-500 text-sm">System-wide audit trail</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
        {logs.map((log) => (
          <div key={log.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white text-sm">
                <span className="text-indigo-400">{log.user_name || "System"}</span>{" "}
                {log.description || `${log.action} on ${log.module}`}
              </p>
              <p className="text-neutral-500 text-xs">{log.module} · {log.action}</p>
            </div>
            <span className="text-neutral-500 text-xs">
              {new Date(log.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}