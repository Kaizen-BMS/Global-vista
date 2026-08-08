import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listEmployeeDocumentsForReport } from "@/lib/actions/employeeDocuments";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { buildExportResponse } from "@/lib/helpers/export";

const COLUMNS = [
  ["employee_name", "Employee"], ["employee_id", "Employee ID"], ["branch_name", "Branch"], ["department_name", "Department"],
  ["document_type", "Document Type"], ["status", "Status"], ["expiry_date", "Expiry Date"],
  ["created_at", "Uploaded Date", "datetime"], ["uploaded_by_name", "Uploaded By"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const [rows, systemSettings] = await Promise.all([listEmployeeDocumentsForReport(session), getSettingsByGroup(session, "system")]);
  return buildExportResponse(rows, COLUMNS, { format, filenameBase: "employee-documents-export", sheetName: "Employee Documents", timezone: systemSettings.timezone || "UTC" });
});
