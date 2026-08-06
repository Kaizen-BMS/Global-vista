import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadsForExport } from "@/lib/modules/crm/actions/leads";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ReportToolbar from "@/components/shared/ReportToolbar";
import ReportTable from "@/components/shared/ReportTable";

const COLUMNS = [
  ["lead_number", "Lead #"], ["name", "Name"], ["phone", "Phone"], ["status", "Status"],
  ["stage", "Stage"], ["priority", "Priority"], ["source_name", "Source"], ["service_name", "Service"],
  ["assigned_name", "Assigned To"], ["created_at", "Created At"],
];

export default async function LeadsReportPage() {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;
  const leads = await listLeadsForExport(session, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white print:text-black">Leads Report</h1>
          <p className="text-neutral-500 text-sm print:text-neutral-700">{leads.length} lead{leads.length === 1 ? "" : "s"}</p>
        </div>
        <ReportToolbar exportBase="/api/leads/export" />
      </div>
      <ReportTable columns={COLUMNS} rows={leads} />
    </div>
  );
}
