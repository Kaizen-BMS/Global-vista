import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getLeadImportHistoryRow } from "@/lib/modules/crm/actions/leadImport";
import { buildExportResponse } from "@/lib/helpers/export";

const COLUMNS = [["row", "Row #"], ["name", "Name"], ["phone", "Phone"], ["reason", "Reason"]];

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();
  const { id } = await ctx.params;
  const historyRow = await getLeadImportHistoryRow(session, id);
  if (!historyRow) return notFound();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  let errorReport = [];
  try { errorReport = JSON.parse(historyRow.error_report || "[]"); } catch { errorReport = []; }

  return buildExportResponse(errorReport, COLUMNS, { format, filenameBase: `lead-import-${id}-failed-rows`, sheetName: "Failed Rows" });
});
