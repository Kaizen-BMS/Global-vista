import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getLeadImportHistoryRow } from "@/lib/modules/crm/actions/leadImport";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();
  const { id } = await ctx.params;
  const historyRow = await getLeadImportHistoryRow(session, id);
  if (!historyRow) return notFound();

  const log = {
    id: historyRow.id,
    fileName: historyRow.file_name,
    importedAt: historyRow.created_at,
    duplicateStrategy: historyRow.duplicate_strategy,
    totals: {
      totalRows: historyRow.total_rows, imported: historyRow.imported_count, updated: historyRow.updated_count,
      skipped: historyRow.skipped_count, failed: historyRow.failed_count, duplicates: historyRow.duplicate_count,
    },
    durationMs: historyRow.duration_ms,
    columnMapping: JSON.parse(historyRow.column_mapping || "{}"),
    errors: JSON.parse(historyRow.error_report || "[]"),
  };

  return new Response(JSON.stringify(log, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="lead-import-${id}-log.json"` },
  });
});
