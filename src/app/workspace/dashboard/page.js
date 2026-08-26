import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { getCompanyBranding } from "@/lib/actions/companyBranding";
import { getActivityLogs } from "@/lib/activityLog";
import { getUserNotifications } from "@/lib/actions/notifications";
import { resolveRange } from "@/lib/helpers/dateRange";
import { formatDate } from "@/lib/helpers/dateFormat";
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
import { getEmployeePaymentDashboard, getSuperAdminPaymentDashboard } from "@/lib/modules/crm/actions/payments";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { isModuleEnabledForCompany, getSubscriptionDetails } from "@/lib/platform/tenant";
import { listSubscriptionPayments } from "@/lib/platform/actions/subscriptionBilling";
import QuickActionsCard from "@/components/cards/QuickActionsCard";
import StorageUsageWidget from "@/components/workspace/dashboard/StorageUsageWidget";
import RangeFilter from "@/components/shared/RangeFilter";
import { CrmKpiGrid, OrgKpiGrid, SubscriptionKpiGrid } from "@/components/workspace/dashboard/KpiGrid";
import { EmployeePaymentKpiGrid, SuperAdminPaymentKpiGrid, RecentPaymentsTable, CollectionsBreakdown } from "@/components/workspace/dashboard/PaymentWidgets";
import { WorkspaceCrmChartsSection, WorkspaceOrgChartsSection } from "@/components/workspace/dashboard/DynamicWorkspaceCharts";
import {
  RecentLeadsTable, TeamPerformanceTable, RecentActivityTable,
  UpcomingAnniversariesTable, RecentLoginsTable,
  MissingDocumentsTable, PendingApprovalDocumentsTable, ExpiringDocumentsTable, RecentlyUploadedDocumentsTable,
} from "@/components/workspace/dashboard/WorkspaceTables";

export default async function DashboardPage({ searchParams }) {
  const session = await getSession();
  const sp = await searchParams;
  // "year" removed from this dashboard's own UI (Financial Year replaces
  // it) — the default preset on first load matches.
  const rangeKey = sp?.range || "financial-year";
  // Timezone has to be known before the range is resolved — a quarter or
  // multi-year boundary computed in the wrong zone can land on the wrong
  // calendar day, which is exactly the class of bug this feature exists
  // to avoid. Fetched once here and reused below rather than re-fetched
  // inside the Promise.all.
  const systemSettings = await getSettingsByGroup(session, "system");
  const timezone = systemSettings.timezone || "UTC";
  // 1-12, month the company's financial year starts in. No dedicated column
  // for this — reuses the same crm_settings key/value store `timezone` and
  // `date_format` already live in, so this needed no schema change. Not
  // hardcoded to April: defaults to it only when the company hasn't set one,
  // and is fully configurable in Settings > System.
  const fyStartMonth = Number(systemSettings.fiscal_year_start_month) || 4;
  const range = resolveRange(rangeKey, sp?.from, sp?.to, { timeZone: timezone, quarter: sp?.quarter, qyear: sp?.qyear, years: sp?.years, fyStartMonth });
  const canManageDocuments = await can(session, "employee_documents.manage");
  const isAdmin = isSuperAdmin(session);
  const paymentsEnabled = await isModuleEnabledForCompany(session.company_id, "payments");

  const [
    stats, crmStats, leadsBySource, leadsByService, leadsByStage, monthlyLeads,
    teamPerformance, recentLeads, orgStats, anniversaries, recentLogins,
    employeeGrowth, departmentDistribution, roleDistribution, documentTrend,
    recentActivity, unreadNotifications, branding,
    missingDocsEmployees, pendingDocs, expiringDocs, recentDocs, storageUsage,
    employeePayments, superAdminPayments, subscriptionDetails, subscriptionPayments,
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
    paymentsEnabled ? getEmployeePaymentDashboard(session) : null,
    paymentsEnabled && isAdmin ? getSuperAdminPaymentDashboard(session) : null,
    isAdmin ? getSubscriptionDetails(session.company_id) : null,
    isAdmin ? listSubscriptionPayments(session) : [],
  ]);

  // Platform subscription billing — what THIS company has paid the
  // platform, not to be confused with the "Payments" section above (money
  // this company collects from its own leads). Only shown once a real
  // completed payment exists.
  const completedPayments = subscriptionPayments.filter((p) => p.status === "completed");
  const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const lastPayment = completedPayments[0] || null; // already ORDER BY created_at DESC

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
          fyStartMonth={fyStartMonth}
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

      {isAdmin && completedPayments.length > 0 && (
        <section className="space-y-4">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Subscription & Billing</p>
          <SubscriptionKpiGrid
            planName={subscriptionDetails?.planName}
            totalPaid={totalPaid}
            currency={lastPayment?.currency || subscriptionDetails?.currency || "INR"}
            lastPaymentAmount={lastPayment?.amount}
            lastPaymentDate={lastPayment ? formatDate(lastPayment.created_at, timezone) : null}
            gateway={lastPayment?.gateway}
          />
        </section>
      )}

      {paymentsEnabled && employeePayments && (
        <section className="space-y-4">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Payments</p>
          <EmployeePaymentKpiGrid data={employeePayments} currency={branding.currency} />
          {isAdmin && superAdminPayments && (
            <>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide pt-2">Company-Wide (Super Admin)</p>
              <SuperAdminPaymentKpiGrid data={superAdminPayments} currency={branding.currency} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <CollectionsBreakdown title="Collections by Service" rows={superAdminPayments.byService} labelKey="service" currency={branding.currency} />
                <CollectionsBreakdown title="Collections by Method" rows={superAdminPayments.byMethod} labelKey="method" currency={branding.currency} />
                <CollectionsBreakdown title="Collections by Employee" rows={superAdminPayments.byEmployee} labelKey="employee" currency={branding.currency} />
              </div>
            </>
          )}
          <RecentPaymentsTable payments={employeePayments.recentPayments} timezone={timezone} />
        </section>
      )}

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
