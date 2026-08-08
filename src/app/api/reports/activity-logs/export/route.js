import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { getActivityLogs } from "@/lib/activityLog";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { buildExportResponse } from "@/lib/helpers/export";

const COLUMNS = [
  ["module", "Module"], ["action", "Action"], ["description", "Description"],
  ["user_name", "User"], ["ip_address", "IP Address"], ["created_at", "Date", "datetime"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "activity_logs.view"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const [logs, systemSettings] = await Promise.all([
    getActivityLogs({ companyId: session.company_id, limit: 5000 }),
    getSettingsByGroup(session, "system"),
  ]);
  return buildExportResponse(logs, COLUMNS, { format, filenameBase: "activity-logs-export", sheetName: "Activity Logs", timezone: systemSettings.timezone || "UTC" });
});
