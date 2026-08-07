import { getSession } from "@/lib/auth";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { getCompanyBranding } from "@/lib/actions/companyBranding";
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
import { WorkspaceCrmChartsSection, WorkspaceOrgChartsSection } from "@/components/workspace/dashboard/DynamicWorkspaceCharts";
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
    recentActivity, unreadNotifications, branding,
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
    getCompanyBranding(session),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">{branding.dashboardGreeting || `Welcome, ${session?.name}`}</h1>
        <p className="text-neutral-500 text-sm">{branding.companyDescription || "Here's what's happening across your workspace today."}</p>
      </div>

      <section className="space-y-4">
        <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wide">CRM Overview</p>
        <CrmKpiGrid crm={crmStats} />
        <WorkspaceCrmChartsSection monthlyLeads={monthlyLeads} leadsByStage={leadsByStage} leadsBySource={leadsBySource} leadsByService={leadsByService} />
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
        <WorkspaceOrgChartsSection employeeGrowth={employeeGrowth} departmentDistribution={departmentDistribution} roleDistribution={roleDistribution} documentTrend={documentTrend} />
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
