import { getSession } from "@/lib/auth";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { getActivityLogs } from "@/lib/activityLog";
import { getUserNotifications } from "@/lib/actions/notifications";
import {
  getLeadDashboardStats, getLeadsBySource, getLeadsByService, getLeadsByStage,
  getMonthlyLeadTrend, getTeamPerformance, getRecentLeads,
} from "@/lib/modules/crm/actions/dashboard";
import {
  getWorkspaceOrgStats, getUpcomingWorkAnniversaries, getRecentLogins,
  getEmployeeGrowth, getDepartmentDistribution, getRoleDistribution, getDocumentUploadTrend,
} from "@/lib/actions/workspaceDashboard";
import QuickActionsCard from "@/components/cards/QuickActionsCard";
import { CrmKpiGrid, OrgKpiGrid } from "@/components/workspace/dashboard/KpiGrid";
import {
  MonthlyLeadTrendChart, PipelineFunnelChart, LeadsBySourceChart, LeadsByServiceChart,
  DepartmentDistributionChart, RoleDistributionChart, EmployeeGrowthChart,
  DocumentUploadTrendChart, UnavailableChart,
} from "@/components/workspace/dashboard/WorkspaceCharts";
import {
  RecentLeadsTable, TeamPerformanceTable, RecentActivityTable,
  UpcomingAnniversariesTable, RecentLoginsTable,
} from "@/components/workspace/dashboard/WorkspaceTables";

export default async function DashboardPage() {
  const session = await getSession();

  const [
    stats, crmStats, leadsBySource, leadsByService, leadsByStage, monthlyLeads,
    teamPerformance, recentLeads, orgStats, anniversaries, recentLogins,
    employeeGrowth, departmentDistribution, roleDistribution, documentTrend,
    recentActivity, unreadNotifications,
  ] = await Promise.all([
    getDashboardStats(session),
    getLeadDashboardStats(session),
    getLeadsBySource(session),
    getLeadsByService(session),
    getLeadsByStage(session),
    getMonthlyLeadTrend(session),
    getTeamPerformance(session),
    getRecentLeads(session, 6),
    getWorkspaceOrgStats(session),
    getUpcomingWorkAnniversaries(session),
    getRecentLogins(session, 8),
    getEmployeeGrowth(session),
    getDepartmentDistribution(session),
    getRoleDistribution(session),
    getDocumentUploadTrend(session),
    getActivityLogs({ limit: 8, companyId: session.company_id }),
    getUserNotifications(session, { unreadOnly: true, limit: 100 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Welcome, {session?.name}</h1>
        <p className="text-neutral-500 text-sm">Here's what's happening across your workspace today.</p>
      </div>

      <section className="space-y-4">
        <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wide">CRM Overview</p>
        <CrmKpiGrid crm={crmStats} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MonthlyLeadTrendChart data={monthlyLeads} />
          <PipelineFunnelChart data={leadsByStage} />
          <LeadsBySourceChart data={leadsBySource} />
          <LeadsByServiceChart data={leadsByService} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentLeadsTable leads={recentLeads} />
          <TeamPerformanceTable team={teamPerformance} />
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wide">Organization Overview</p>
        <OrgKpiGrid
          activeUsers={stats.activeUsers}
          roles={stats.roles}
          lockedAccounts={stats.lockedAccounts}
          org={orgStats}
          anniversaryCount={anniversaries.length}
          unreadNotifications={unreadNotifications.length}
          recentLoginCount={recentLogins.length}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EmployeeGrowthChart data={employeeGrowth} />
          <DepartmentDistributionChart data={departmentDistribution} />
          <RoleDistributionChart data={roleDistribution} />
          <DocumentUploadTrendChart data={documentTrend} />
          <UnavailableChart title="Attendance Trend" reason="Attendance tracking is not part of the current schema — needs a dedicated attendance table before this can show real data." />
          <UnavailableChart title="Leave Trend" reason="Leave management is not part of the current schema — needs a dedicated leave-requests table before this can show real data." />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RecentActivityTable logs={recentActivity} />
          <UpcomingAnniversariesTable people={anniversaries} />
          <RecentLoginsTable logins={recentLogins} />
        </div>
      </section>

      <QuickActionsCard />
    </div>
  );
}
