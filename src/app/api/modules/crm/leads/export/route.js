import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listLeads } from "@/lib/actions/leads";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.export"))) return forbidden();

  const { leads } = await listLeads(session, { pageSize: 1000 });

  const headers = ["Lead Number", "Name", "Phone", "Email", "Country", "Source", "Service", "Stage", "Status", "Assigned To", "Created At"];
  const rows = leads.map((l) => [
    l.lead_number, l.name, l.phone, l.email || "", l.country || "",
    l.source_name, l.service_name, l.stage, l.status, l.assigned_name || "",
    new Date(l.created_at).toISOString(),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.csv"`,
    },
  });
});