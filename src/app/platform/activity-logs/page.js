import { getActivityLogs } from "@/lib/activityLog";
import ReportToolbar from "@/components/shared/ReportToolbar";

export default async function PlatformActivityLogsPage() {
  const logs = await getActivityLogs({ module: "platform", limit: 100 });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-white">Platform Activity</h1>
        <ReportToolbar exportBase="/api/platform/activity-logs/export" />
      </div>
      <p className="text-neutral-500 text-sm mb-6">Every platform-level action across the system.</p>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <p className="text-neutral-600 text-sm text-center py-10">No platform activity recorded yet.</p>
        ) : (
          <div className="divide-y divide-neutral-800">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-neutral-200 text-sm">{l.description || `${l.action} on ${l.entity_type || l.module}`}</p>
                  <p className="text-neutral-600 text-xs mt-0.5">{l.user_name || "System"} · {l.action}</p>
                </div>
                <span className="text-neutral-600 text-xs shrink-0 ml-3">{new Date(l.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
