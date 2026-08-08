import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { withErrorHandling } from "@/lib/helpers/response";
import { getActivityLogs } from "@/lib/activityLog";
import { getPlatformTimezone } from "@/lib/platform/actions/settings";
import { buildExportResponse } from "@/lib/helpers/export";

const COLUMNS = [
  ["module", "Module"], ["action", "Action"], ["description", "Description"], ["user_name", "User"], ["created_at", "Date", "datetime"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  assertPlatformOperator(session);
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const [logs, timezone] = await Promise.all([getActivityLogs({ module: "platform", limit: 5000 }), getPlatformTimezone()]);
  return buildExportResponse(logs, COLUMNS, { format, filenameBase: "platform-activity-export", sheetName: "Activity", timezone });
});
