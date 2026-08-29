import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listLeadsForExport } from "@/lib/modules/crm/actions/leads";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { buildExportResponse } from "@/lib/helpers/export";
import { assertImportExportAllowed } from "@/lib/platform/tenant";

const COLUMNS = [
  ["lead_number", "Lead Number"], ["name", "Name"], ["email", "Email"], ["phone", "Phone"],
  ["whatsapp", "WhatsApp"], ["status", "Status"], ["stage", "Stage"], ["priority", "Priority"],
  ["source_name", "Source"], ["service_name", "Service"], ["assigned_name", "Assigned To"],
  ["country", "Country"], ["state", "State"], ["city", "City"],
  ["preferred_country", "Preferred Country"], ["preferred_university", "Preferred University"],
  ["passport_status", "Passport Status"], ["tags", "Tags"], ["created_at", "Created At", "datetime"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.export"))) return forbidden();
  await assertImportExportAllowed(session.company_id);

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const systemSettings = await getSettingsByGroup(session, "system");
  const leads = await listLeadsForExport(session, {
    status: searchParams.get("status") || null,
    stage: searchParams.get("stage") || null,
    sourceId: searchParams.get("sourceId") || null,
    serviceId: searchParams.get("serviceId") || null,
    search: searchParams.get("search") || null,
    priority: searchParams.get("priority") || null,
    assignedTo: searchParams.get("assignedTo") || null,
    country: searchParams.get("country") || null,
    tag: searchParams.get("tag") || null,
    createdFrom: searchParams.get("createdFrom") || null,
    createdTo: searchParams.get("createdTo") || null,
  });

  return buildExportResponse(leads, COLUMNS, { format, filenameBase: "leads-export", sheetName: "Leads", timezone: systemSettings.timezone || "UTC" });
});
