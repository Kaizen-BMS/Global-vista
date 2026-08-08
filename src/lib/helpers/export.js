import * as XLSX from "xlsx";
import { formatDateTime, formatDate, zoneAbbreviation } from "@/lib/helpers/dateFormat";

/**
 * Shared by every report/export route so the xlsx boilerplate (sheet
 * building, content-type, filename) lives in one place instead of
 * being copy-pasted per report type.
 *
 * Columns are `[key, label]` or `[key, label, "datetime"]` — the third
 * element marks a column that holds a raw Date/timestamp so it gets
 * rendered as a formatted string in the requested timezone (with the zone
 * abbreviation appended to the header) instead of a bare xlsx date cell,
 * which the xlsx library otherwise serializes using the Date's UTC
 * components regardless of the tenant's configured timezone.
 */
export function buildExportResponse(rows, columns, { format = "xlsx", filenameBase = "export", sheetName = "Data", timezone = "UTC" } = {}) {
  const abbrev = zoneAbbreviation(timezone, new Date());
  const headers = columns.map(([, label, type]) => (type === "datetime" ? `${label} (${abbrev})` : label));
  const mapped = rows.map((row) =>
    Object.fromEntries(columns.map(([key, label, type], i) => [
      headers[i],
      type === "datetime" ? formatDateTime(row[key], timezone) : (row[key] ?? ""),
    ]))
  );
  const sheet = XLSX.utils.json_to_sheet(mapped, { header: headers });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  const buffer = XLSX.write(book, { type: "buffer", bookType: format === "csv" ? "csv" : "xlsx" });
  const filename = `${filenameBase}-${formatDate(new Date(), timezone).replace(/[, ]+/g, "-")}.${format}`;
  return new Response(buffer, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
