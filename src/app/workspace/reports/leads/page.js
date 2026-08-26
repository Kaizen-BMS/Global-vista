import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { isModuleEnabledForCompany } from "@/lib/platform/tenant";
import { listLeadsForExport } from "@/lib/modules/crm/actions/leads";
import { getLeadDashboardStats, getLeadsBySource, getLeadsByService, getLeadsByStage, getMonthlyLeadTrend } from "@/lib/modules/crm/actions/dashboard";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { resolveRange } from "@/lib/helpers/dateRange";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ReportToolbar from "@/components/shared/ReportToolbar";
import ReportTable from "@/components/shared/ReportTable";
import ReportPrintHeader from "@/components/shared/ReportPrintHeader";
import RangeFilter from "@/components/shared/RangeFilter";
import { CrmKpiGrid } from "@/components/workspace/dashboard/KpiGrid";
import { WorkspaceCrmChartsSection } from "@/components/workspace/dashboard/DynamicWorkspaceCharts";

const COLUMNS = [
  ["lead_number", "Lead #"], ["name", "Name"], ["phone", "Phone"], ["status", "Status"],
  ["stage", "Stage"], ["priority", "Priority"], ["source_name", "Source"], ["service_name", "Service"],
  ["assigned_name", "Assigned To"], ["created_at", "Created At"],
];

export default async function LeadsReportPage({ searchParams }) {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;
  if (!(await isModuleEnabledForCompany(session.company_id, "reports"))) {
    return <ForbiddenState message="Reports isn't included in your company's current plan. Contact the platform team to enable it." />;
  }

  const sp = await searchParams;
  const rangeKey = sp?.range || "financial-year";
  const systemSettings = await getSettingsByGroup(session, "system");
  const timezone = systemSettings.timezone || "UTC";
  const fyStartMonth = Number(systemSettings.fiscal_year_start_month) || 4;
  const range = resolveRange(rangeKey, sp?.from, sp?.to, { timeZone: timezone, quarter: sp?.quarter, qyear: sp?.qyear, years: sp?.years, fyStartMonth });

  const [leads, crmStats, leadsBySource, leadsByService, leadsByStage, monthlyLeads] = await Promise.all([
    listLeadsForExport(session, {}),
    getLeadDashboardStats(session),
    getLeadsBySource(session),
    getLeadsByService(session),
    getLeadsByStage(session),
    getMonthlyLeadTrend(session, range),
  ]);

  return (
    <div>
      <ReportPrintHeader session={session} title="Leads Report" subtitle={`${leads.length} lead${leads.length === 1 ? "" : "s"}`} timezone={timezone} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Leads Report</h1>
          <p className="text-muted-foreground text-sm">{leads.length} lead{leads.length === 1 ? "" : "s"} — broken down by how your team actually captures and works them: source, service, and stage.</p>
        </div>
        <div className="flex items-center gap-3">
          <RangeFilter
            active={rangeKey} from={sp?.from} to={sp?.to}
            quarter={sp?.quarter ? Number(sp.quarter) : undefined} qyear={sp?.qyear ? Number(sp.qyear) : undefined} years={sp?.years ? Number(sp.years) : undefined}
            rangeStart={range.start} rangeEnd={range.end} timezone={timezone}
            basePath="/workspace/reports/leads"
            fyStartMonth={fyStartMonth}
          />
          <ReportToolbar exportBase="/api/leads/export" />
        </div>
      </div>

      <div className="print:hidden space-y-4 mb-8">
        <CrmKpiGrid crm={crmStats} />
        <WorkspaceCrmChartsSection monthlyLeads={monthlyLeads} leadsByStage={leadsByStage} leadsBySource={leadsBySource} leadsByService={leadsByService} />
      </div>

      <ReportTable columns={COLUMNS} rows={leads} timezone={timezone} />
    </div>
  );
}
