import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listLeadsForExport } from "@/lib/modules/crm/actions/leads";
import * as XLSX from "xlsx";

const COLUMNS = [
  ["lead_number", "Lead Number"], ["name", "Name"], ["email", "Email"], ["phone", "Phone"],
  ["whatsapp", "WhatsApp"], ["status", "Status"], ["stage", "Stage"], ["priority", "Priority"],
  ["source_name", "Source"], ["service_name", "Service"], ["assigned_name", "Assigned To"],
  ["country", "Country"], ["state", "State"], ["city", "City"],
  ["preferred_country", "Preferred Country"], ["preferred_university", "Preferred University"],
  ["passport_status", "Passport Status"], ["tags", "Tags"], ["created_at", "Created At"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.export"))) return forbidden();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const leads = await listLeadsForExport(session, {
    status: searchParams.get("status") || null,
    stage: searchParams.get("stage") || null,
    sourceId: searchParams.get("sourceId") || null,
    serviceId: searchParams.get("serviceId") || null,
    search: searchParams.get("search") || null,
  });

  const rows = leads.map((l) => Object.fromEntries(COLUMNS.map(([key, label]) => [label, l[key] ?? ""])));
  const sheet = XLSX.utils.json_to_sheet(rows, { header: COLUMNS.map(([, label]) => label) });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Leads");

  const buffer = XLSX.write(book, { type: "buffer", bookType: format === "csv" ? "csv" : "xlsx" });
  const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.${format}`;

  return new Response(buffer, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
