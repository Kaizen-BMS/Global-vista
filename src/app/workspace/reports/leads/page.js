import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadsForExport } from "@/lib/modules/crm/actions/leads";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ReportToolbar from "@/components/shared/ReportToolbar";
import ReportTable from "@/components/shared/ReportTable";
import ReportPrintHeader from "@/components/shared/ReportPrintHeader";

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
      <ReportPrintHeader session={session} title="Leads Report" subtitle={`${leads.length} lead${leads.length === 1 ? "" : "s"}`} />
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-white">Leads Report</h1>
          <p className="text-neutral-500 text-sm">{leads.length} lead{leads.length === 1 ? "" : "s"}</p>
        </div>
        <ReportToolbar exportBase="/api/leads/export" />
      </div>
      <ReportTable columns={COLUMNS} rows={leads} />
    </div>
  );
}
