import { getActivityLogs } from "@/lib/activityLog";
import { getPlatformTimezone } from "@/lib/platform/actions/settings";
import ReportToolbar from "@/components/shared/ReportToolbar";
import { formatDateTimeWithZone } from "@/lib/helpers/dateFormat";

export default async function PlatformActivityLogsPage() {
  const [logs, timezone] = await Promise.all([getActivityLogs({ module: "platform", limit: 100 }), getPlatformTimezone()]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-foreground">Platform Activity</h1>
        <ReportToolbar exportBase="/api/platform/activity-logs/export" />
      </div>
      <p className="text-muted-foreground text-sm mb-6">Every platform-level action across the system.</p>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-10">No platform activity recorded yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-foreground text-sm">{l.description || `${l.action} on ${l.entity_type || l.module}`}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{l.user_name || "System"} · {l.action}</p>
                </div>
                <span className="text-muted-foreground text-xs shrink-0 ml-3">{formatDateTimeWithZone(l.created_at, timezone)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
