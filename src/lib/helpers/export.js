import * as XLSX from "xlsx";

/**
 * Shared by every report/export route so the xlsx boilerplate (sheet
 * building, content-type, filename) lives in one place instead of
 * being copy-pasted per report type.
 */
export function buildExportResponse(rows, columns, { format = "xlsx", filenameBase = "export", sheetName = "Data" } = {}) {
  const mapped = rows.map((row) => Object.fromEntries(columns.map(([key, label]) => [label, row[key] ?? ""])));
  const sheet = XLSX.utils.json_to_sheet(mapped, { header: columns.map(([, label]) => label) });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  const buffer = XLSX.write(book, { type: "buffer", bookType: format === "csv" ? "csv" : "xlsx" });
  const filename = `${filenameBase}-${new Date().toISOString().slice(0, 10)}.${format}`;
  return new Response(buffer, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
