import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getActivityLogs } from "@/lib/activityLog";
import { getSettingsByGroup } from "@/lib/actions/settings";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ReportToolbar from "@/components/shared/ReportToolbar";
import ReportTable from "@/components/shared/ReportTable";
import ReportPrintHeader from "@/components/shared/ReportPrintHeader";

const COLUMNS = [
  ["module", "Module"], ["action", "Action"], ["description", "Description"], ["user_name", "User"], ["created_at", "Date"],
];

export default async function ActivityLogsReportPage() {
  const session = await getSession();
  if (!(await can(session, "activity_logs.view"))) return <ForbiddenState />;
  const [logs, systemSettings] = await Promise.all([getActivityLogs({ companyId: session.company_id, limit: 500 }), getSettingsByGroup(session, "system")]);
  const timezone = systemSettings.timezone || "UTC";

  return (
    <div>
      <ReportPrintHeader session={session} title="Activity Log Report" subtitle={`${logs.length} entries (most recent 500)`} timezone={timezone} />
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Activity Log Report</h1>
          <p className="text-muted-foreground text-sm">{logs.length} entries (most recent 500)</p>
        </div>
        <ReportToolbar exportBase="/api/reports/activity-logs/export" />
      </div>
      <ReportTable columns={COLUMNS} rows={logs} timezone={timezone} />
    </div>
  );
}
