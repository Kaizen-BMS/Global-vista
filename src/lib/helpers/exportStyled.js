import "server-only";
import ExcelJS from "exceljs";
import { formatDateTime, formatDate, zoneAbbreviation } from "@/lib/helpers/dateFormat";

// A fixed, readable-in-both-themes palette — same color for the same
// value across every export (e.g. the same school is always the same
// shade), picked deterministically from a tiny string hash so it needs no
// extra lookup table as new values show up.
const ROW_TINTS = ["FFFDE7D0", "FFE0F2F1", "FFE8EAF6", "FFFCE4EC", "FFF1F8E9", "FFFFF9C4", "FFE1F5FE", "FFF3E5F5"];
function tintForValue(value) {
  if (!value) return null;
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return ROW_TINTS[hash % ROW_TINTS.length];
}

// A fixed, documented placeholder — this only deters accidental edits to
// locked cells (Student ID, Lead Number, headers, ...); it is never a real
// access boundary. The app's own login-gated import flow is the real
// authorization for anything this sheet's unlocked cells can change.
const SHEET_PASSWORD = "gv-student-sheet";

/**
 * Schools-only styled .xlsx export — color-coded by `tintKey`'s value,
 * frozen/bold header, data-validation dropdowns on `dropdowns`, and sheet
 * protection locking every column except `unlockedKeys` (the same fields
 * commitLeadImportChunk's applyImportExtras can write back on re-import).
 * CSV export and every non-child company's export never call this —
 * they keep using the plain buildExportResponse unchanged.
 */
export async function buildStyledExportResponse(rows, columns, {
  blankColumns = [], unlockedKeys = new Set(), dropdowns = {}, tintKey = null,
  filenameBase = "export", sheetName = "Students", timezone = "UTC",
} = {}) {
  const abbrev = zoneAbbreviation(timezone, new Date());
  const allColumns = [...columns, ...blankColumns.map((c) => [c[0], c[1], null])];
  const headers = allColumns.map(([, label, type]) => (type === "datetime" ? `${label} (${abbrev})` : label));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = allColumns.map(([key], i) => ({ key, width: Math.max(14, headers[i].length + 2) }));

  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
    cell.protection = { locked: true };
  });

  for (const row of rows) {
    const values = allColumns.map(([key, , type]) => (blankColumns.some((c) => c[0] === key) ? "" : (type === "datetime" ? formatDateTime(row[key], timezone) : (row[key] ?? ""))));
    const excelRow = sheet.addRow(values);
    const tint = tintKey ? tintForValue(String(row[tintKey] || "")) : null;
    excelRow.eachCell((cell, colNumber) => {
      const key = allColumns[colNumber - 1][0];
      cell.protection = { locked: !unlockedKeys.has(key) };
      if (tint) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tint } };
    });
  }

  for (const [key, options] of Object.entries(dropdowns)) {
    const colIndex = allColumns.findIndex(([k]) => k === key);
    if (colIndex === -1 || !options?.length) continue;
    const colLetter = sheet.getColumn(colIndex + 1).letter;
    for (let r = 2; r <= rows.length + 1; r++) {
      sheet.getCell(`${colLetter}${r}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [`"${options.join(",")}"`],
        showErrorMessage: true, errorTitle: "Invalid value", error: `Pick one of: ${options.join(", ")}`,
      };
    }
  }

  await sheet.protect(SHEET_PASSWORD, { selectLockedCells: true, selectUnlockedCells: true });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${filenameBase}-${formatDate(new Date(), timezone).replace(/[, ]+/g, "-")}.xlsx`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
