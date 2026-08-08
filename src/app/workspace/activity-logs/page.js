import { getSession } from "@/lib/auth";
import { getActivityLogs } from "@/lib/activityLog";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { formatDateTime } from "@/lib/helpers/dateFormat";

export default async function ActivityLogsPage() {
  const session = await getSession();
  const [logs, systemSettings] = await Promise.all([
    getActivityLogs({ limit: 100, companyId: session.company_id }),
    getSettingsByGroup(session, "system"),
  ]);
  const timezone = systemSettings.timezone || "UTC";
  const hour12 = systemSettings.time_format !== "24h";
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-6">Activity Logs</h1>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {logs.map((l) => <div key={l.id} className="px-4 py-3 flex justify-between"><p className="text-foreground text-sm"><span className="text-indigo-400">{l.user_name || "System"}</span> {l.description}</p><span className="text-muted-foreground text-xs">{formatDateTime(l.created_at, timezone, { hour12 })}</span></div>)}
      </div>
    </div>
  );
}