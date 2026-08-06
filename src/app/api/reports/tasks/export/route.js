import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listAllTasks } from "@/lib/modules/crm/actions/leadTasks";
import { buildExportResponse } from "@/lib/helpers/export";

const COLUMNS = [
  ["title", "Title"], ["lead_name", "Lead"], ["lead_number", "Lead Number"], ["assigned_name", "Assigned To"],
  ["priority", "Priority"], ["due_date", "Due Date"], ["is_completed", "Completed"], ["created_at", "Created At"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.tasks.manage"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const tasks = await listAllTasks(session);
  return buildExportResponse(tasks, COLUMNS, { format, filenameBase: "tasks-export", sheetName: "Tasks" });
});
