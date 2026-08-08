import { getSession } from "@/lib/auth";
import { canAny } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listAllDocuments } from "@/lib/actions/documentsReport";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { buildExportResponse } from "@/lib/helpers/export";

const COLUMNS = [
  ["source", "Type"], ["type", "Document Type"], ["file_name", "File Name"], ["related_to", "Related To"],
  ["related_number", "Reference"], ["uploaded_by_name", "Uploaded By"], ["file_size", "Size (bytes)"], ["created_at", "Uploaded At", "datetime"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await canAny(session, ["employee_documents.manage", "leads.documents.manage"]))) return forbidden();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const [docs, systemSettings] = await Promise.all([listAllDocuments(session), getSettingsByGroup(session, "system")]);
  return buildExportResponse(docs, COLUMNS, { format, filenameBase: "documents-export", sheetName: "Documents", timezone: systemSettings.timezone || "UTC" });
});
