import { getSession } from "@/lib/auth";
import { getActivityLogs } from "@/lib/activityLog";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { listUsers } from "@/lib/actions/users";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import CollapsibleLogGroup from "@/components/shared/CollapsibleLogGroup";
import ActivityLogFilters from "@/components/workspace/ActivityLogFilters";

// Schools only — same day/yesterday/earlier split a counsellor would
// expect from a "minimalistic" activity feed, collapsed by default so the
// page opens short instead of a long flat list.
function groupByDay(logs) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  for (const l of logs) {
    const d = new Date(l.created_at); d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups.Today.push(l);
    else if (d.getTime() === yesterday.getTime()) groups.Yesterday.push(l);
    else groups.Earlier.push(l);
  }
  return groups;
}

export default async function ActivityLogsPage({ searchParams }) {
  const session = await getSession();
  const sp = await searchParams;
  const [logs, systemSettings, employeesResult] = await Promise.all([
    getActivityLogs({ limit: 100, companyId: session.company_id, userId: sp?.employee || null }),
    getSettingsByGroup(session, "system"),
    listUsers(session, { status: "active", pageSize: 100 }),
  ]);
  const timezone = systemSettings.timezone || "UTC";
  const hour12 = systemSettings.time_format !== "24h";

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-6">Activity Logs</h1>
      <ActivityLogFilters employees={employeesResult.users} />
      {session.is_child_company ? (
        <div className="space-y-3">
          {(() => {
            const groups = groupByDay(logs);
            return (
              <>
                <CollapsibleLogGroup persistKey="activity-today" title="Today" logs={groups.Today} timezone={timezone} hour12={hour12} />
                <CollapsibleLogGroup persistKey="activity-yesterday" title="Yesterday" logs={groups.Yesterday} timezone={timezone} hour12={hour12} />
                <CollapsibleLogGroup persistKey="activity-earlier" title="Earlier" logs={groups.Earlier} timezone={timezone} hour12={hour12} />
              </>
            );
          })()}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {logs.map((l) => <div key={l.id} className="px-4 py-3 flex justify-between"><p className="text-foreground text-sm"><span className="text-indigo-400">{l.user_name || "System"}</span> {l.description}</p><span className="text-muted-foreground text-xs">{formatDateTime(l.created_at, timezone, { hour12 })}</span></div>)}
        </div>
      )}
    </div>
  );
}