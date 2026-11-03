"use client";
import {
  MonthlyLeadTrendChart, PipelineFunnelChart, LeadsBySourceChart, LeadsByServiceChart, LeadsByStageChart, LeadsBySchoolChart,
  DepartmentDistributionChart, RoleDistributionChart, EmployeeGrowthChart,
  DocumentUploadTrendChart, UnavailableChart,
} from "@/components/workspace/dashboard/WorkspaceCharts";

/**
 * Two dynamic-import boundaries (CRM charts, Org charts) for every
 * recharts-dependent component on the workspace dashboard — recharts is
 * a large dependency, and this is a high-traffic entry point, so its JS
 * is deferred until after the rest of the dashboard (KPIs, tables) has
 * already painted. See the dynamic() calls in dashboard/page.js.
 *
 * `isGveParent`/`leadsBySchool` are only ever passed for GVE's own
 * dashboard (every other company passes neither) — swaps the stage funnel
 * for a pie (same {stage,count} data either way) and adds a "Leads by
 * School" pie; every other chart here already receives GVE-aggregated
 * data from the page itself, no further change needed.
 */
export function WorkspaceCrmChartsSection({ monthlyLeads, leadsByStage, leadsBySource, leadsByService, isGveParent = false, leadsBySchool }) {
  return (
    <div className={`grid grid-cols-1 ${isGveParent ? "sm:grid-cols-2 lg:grid-cols-3" : "lg:grid-cols-2"} gap-3`}>
      <MonthlyLeadTrendChart data={monthlyLeads} compact={isGveParent} />
      {isGveParent ? <LeadsByStageChart data={leadsByStage} compact /> : <PipelineFunnelChart data={leadsByStage} />}
      <LeadsBySourceChart data={leadsBySource} compact={isGveParent} />
      <LeadsByServiceChart data={leadsByService} compact={isGveParent} />
      {isGveParent && <LeadsBySchoolChart data={leadsBySchool} compact />}
    </div>
  );
}

export function WorkspaceOrgChartsSection({ employeeGrowth, departmentDistribution, roleDistribution, documentTrend }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <EmployeeGrowthChart data={employeeGrowth} />
      <DepartmentDistributionChart data={departmentDistribution} />
      <RoleDistributionChart data={roleDistribution} />
      <DocumentUploadTrendChart data={documentTrend} />
      <UnavailableChart title="Attendance Trend" reason="Attendance tracking is not part of the current schema — needs a dedicated attendance table before this can show real data." />
      <UnavailableChart title="Leave Trend" reason="Leave management is not part of the current schema — needs a dedicated leave-requests table before this can show real data." />
    </div>
  );
}
