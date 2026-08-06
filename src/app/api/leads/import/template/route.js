import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { buildLeadTemplateRow } from "@/lib/modules/crm/actions/leadImport";
import { LEAD_IMPORT_FIELDS } from "@/lib/modules/crm/constants/leadImportFields";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { buildExportResponse } from "@/lib/helpers/export";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const [sources, services] = await Promise.all([listLeadSources(session), listServices(session)]);
  const columns = LEAD_IMPORT_FIELDS.map((f) => [f.key, f.label]);
  const exampleRow = buildLeadTemplateRow({ firstSourceName: sources[0]?.name, firstServiceName: services[0]?.name });

  return buildExportResponse([exampleRow], columns, { format, filenameBase: "leads-import-template", sheetName: "Leads" });
});
