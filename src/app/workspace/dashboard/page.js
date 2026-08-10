import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { getCompanyBranding } from "@/lib/actions/companyBranding";
import { getActivityLogs } from "@/lib/activityLog";
import { getUserNotifications } from "@/lib/actions/notifications";
import { resolveRange } from "@/lib/helpers/dateRange";
import { getSettingsByGroup } from "@/lib/actions/settings";
import {
  getLeadDashboardStats, getLeadsBySource, getLeadsByService, getLeadsByStage,
  getMonthlyLeadTrend, getTeamPerformance, getRecentLeads,
} from "@/lib/modules/crm/actions/dashboard";
import {
  getWorkspaceOrgStats, getUpcomingWorkAnniversaries, getRecentLogins,
  getEmployeeGrowth, getDepartmentDistribution, getRoleDistribution, getDocumentUploadTrend,
} from "@/lib/actions/workspaceDashboard";
import {
  getEmployeesWithMissingDocuments, getPendingApprovalDocuments, getExpiringDocuments, getRecentlyUploadedDocuments,
} from "@/lib/actions/employeeDocuments";
import { getStorageUsage } from "@/lib/actions/storage";
import QuickActionsCard from "@/components/cards/QuickActionsCard";
import StorageUsageWidget from "@/components/workspace/dashboard/StorageUsageWidget";
import RangeFilter from "@/components/shared/RangeFilter";
import { CrmKpiGrid, OrgKpiGrid } from "@/components/workspace/dashboard/KpiGrid";
import { WorkspaceCrmChartsSection, WorkspaceOrgChartsSection } from "@/components/workspace/dashboard/DynamicWorkspaceCharts";
import {
  RecentLeadsTable, TeamPerformanceTable, RecentActivityTable,
  UpcomingAnniversariesTable, RecentLoginsTable,
  MissingDocumentsTable, PendingApprovalDocumentsTable, ExpiringDocumentsTable, RecentlyUploadedDocumentsTable,
} from "@/components/workspace/dashboard/WorkspaceTables";

export default async function DashboardPage({ searchParams }) {
  const session = await getSession();
  const sp = await searchParams;
  const rangeKey = sp?.range || "year";
  // Timezone has to be known before the range is resolved — a quarter or
  // multi-year boundary computed in the wrong zone can land on the wrong
  // calendar day, which is exactly the class of bug this feature exists
  // to avoid. Fetched once here and reused below rather than re-fetched
  // inside the Promise.all.
  const systemSettings = await getSettingsByGroup(session, "system");
  const timezone = systemSettings.timezone || "UTC";
  const range = resolveRange(rangeKey, sp?.from, sp?.to, { timeZone: timezone, quarter: sp?.quarter, qyear: sp?.qyear, years: sp?.years });
  const canManageDocuments = await can(session, "employee_documents.manage");

  const [
    stats, crmStats, leadsBySource, leadsByService, leadsByStage, monthlyLeads,
    teamPerformance, recentLeads, orgStats, anniversaries, recentLogins,
    employeeGrowth, departmentDistribution, roleDistribution, documentTrend,
    recentActivity, unreadNotifications, branding,
    missingDocsEmployees, pendingDocs, expiringDocs, recentDocs, storageUsage,
  ] = await Promise.all([
    getDashboardStats(session),
    getLeadDashboardStats(session),
    getLeadsBySource(session),
    getLeadsByService(session),
    getLeadsByStage(session),
    getMonthlyLeadTrend(session, range),
    getTeamPerformance(session),
    getRecentLeads(session, 6),
    getWorkspaceOrgStats(session),
    getUpcomingWorkAnniversaries(session),
    getRecentLogins(session, 8),
    getEmployeeGrowth(session, range),
    getDepartmentDistribution(session),
    getRoleDistribution(session),
    getDocumentUploadTrend(session, range),
    getActivityLogs({ limit: 8, companyId: session.company_id }),
    getUserNotifications(session, { unreadOnly: true, limit: 100 }),
    getCompanyBranding(session),
    canManageDocuments ? getEmployeesWithMissingDocuments(session) : [],
    canManageDocuments ? getPendingApprovalDocuments(session) : [],
    canManageDocuments ? getExpiringDocuments(session) : [],
    canManageDocuments ? getRecentlyUploadedDocuments(session) : [],
    getStorageUsage(session),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{branding.dashboardGreeting || `Welcome, ${session?.name}`}</h1>
          <p className="text-muted-foreground text-sm">{branding.companyDescription || "Here's what's happening across your workspace today."}</p>
        </div>
        <RangeFilter
          active={rangeKey} from={sp?.from} to={sp?.to}
          quarter={sp?.quarter ? Number(sp.quarter) : undefined} qyear={sp?.qyear ? Number(sp.qyear) : undefined} years={sp?.years ? Number(sp.years) : undefined}
          rangeStart={range.start} rangeEnd={range.end} timezone={timezone}
          basePath="/workspace/dashboard"
        />
      </div>

      <section className="space-y-4">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">CRM Overview</p>
        <CrmKpiGrid crm={crmStats} />
        <WorkspaceCrmChartsSection monthlyLeads={monthlyLeads} leadsByStage={leadsByStage} leadsBySource={leadsBySource} leadsByService={leadsByService} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentLeadsTable leads={recentLeads} />
          <TeamPerformanceTable team={teamPerformance} />
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Organization Overview</p>
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
          <RecentActivityTable logs={recentActivity} timezone={timezone} />
          <UpcomingAnniversariesTable people={anniversaries} />
          <RecentLoginsTable logins={recentLogins} timezone={timezone} />
        </div>
      </section>

      {canManageDocuments && (
        <section className="space-y-4">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Employee Documents</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MissingDocumentsTable employees={missingDocsEmployees} />
            <PendingApprovalDocumentsTable documents={pendingDocs} />
            <ExpiringDocumentsTable documents={expiringDocs} timezone={timezone} />
            <RecentlyUploadedDocumentsTable documents={recentDocs} timezone={timezone} />
            <StorageUsageWidget usage={storageUsage} />
          </div>
        </section>
      )}

      <QuickActionsCard />
    </div>
  );
}
