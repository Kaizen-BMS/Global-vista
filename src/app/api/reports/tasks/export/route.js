import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listAllTasks } from "@/lib/modules/crm/actions/leadTasks";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { buildExportResponse } from "@/lib/helpers/export";

const COLUMNS = [
  ["title", "Title"], ["lead_name", "Lead"], ["lead_number", "Lead Number"], ["assigned_name", "Assigned To"],
  ["priority", "Priority"], ["due_date", "Due Date", "datetime"], ["is_completed", "Completed"], ["created_at", "Created At", "datetime"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.tasks.manage"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const [tasks, systemSettings] = await Promise.all([listAllTasks(session), getSettingsByGroup(session, "system")]);
  return buildExportResponse(tasks, COLUMNS, { format, filenameBase: "tasks-export", sheetName: "Tasks", timezone: systemSettings.timezone || "UTC" });
});
