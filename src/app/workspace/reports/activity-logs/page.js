import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getActivityLogs } from "@/lib/activityLog";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ReportToolbar from "@/components/shared/ReportToolbar";
import ReportTable from "@/components/shared/ReportTable";

const COLUMNS = [
  ["module", "Module"], ["action", "Action"], ["description", "Description"], ["user_name", "User"], ["created_at", "Date"],
];

export default async function ActivityLogsReportPage() {
  const session = await getSession();
  if (!(await can(session, "activity_logs.view"))) return <ForbiddenState />;
  const logs = await getActivityLogs({ companyId: session.company_id, limit: 500 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white print:text-black">Activity Log Report</h1>
          <p className="text-neutral-500 text-sm print:text-neutral-700">{logs.length} entries (most recent 500)</p>
        </div>
        <ReportToolbar exportBase="/api/reports/activity-logs/export" />
      </div>
      <ReportTable columns={COLUMNS} rows={logs} />
    </div>
  );
}
