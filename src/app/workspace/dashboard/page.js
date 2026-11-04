import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { getCompanyBranding } from "@/lib/actions/companyBranding";
import { getActivityLogs } from "@/lib/activityLog";
import { getUserNotifications } from "@/lib/actions/notifications";
import { getLatestAnnouncement, getLatestParentAnnouncement } from "@/lib/actions/messaging";
import { resolveRange } from "@/lib/helpers/dateRange";
import { formatDate } from "@/lib/helpers/dateFormat";
import { getSettingsByGroup } from "@/lib/actions/settings";
import {
  getLeadDashboardStats, getLeadsBySource, getLeadsByService, getLeadsByStage,
  getMonthlyLeadTrend, getTeamPerformance, getTeamPerformanceByStream, getRecentLeads,
} from "@/lib/modules/crm/actions/dashboard";
import {
  getAggregatedLeadDashboardStats, getAggregatedLeadsBySource, getAggregatedLeadsByService, getAggregatedLeadsByStage,
  listAggregatedSchoolLeads, getSchoolsOverview,
} from "@/lib/actions/companySwitch";
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
import { isModuleEnabledForCompany, getSubscriptionDetails, getCurrentCompany } from "@/lib/platform/tenant";
import { listSubscriptionPayments } from "@/lib/platform/actions/subscriptionBilling";
import QuickActionsCard from "@/components/cards/QuickActionsCard";
import CollapsibleLogGroup from "@/components/shared/CollapsibleLogGroup";
import CollapsibleSection from "@/components/shared/CollapsibleSection";
import AnnouncementBanner from "@/components/workspace/dashboard/AnnouncementBanner";
import SchoolBanner from "@/components/workspace/dashboard/SchoolBanner";
import StorageUsageWidget from "@/components/workspace/dashboard/StorageUsageWidget";
import RangeFilter from "@/components/shared/RangeFilter";
import { CrmKpiGrid, OrgKpiGrid, SubscriptionKpiGrid } from "@/components/workspace/dashboard/KpiGrid";
import { EmployeePaymentKpiGrid, SuperAdminPaymentKpiGrid, RecentPaymentsTable, CollectionsBreakdown } from "@/components/workspace/dashboard/PaymentWidgets";
import { WorkspaceCrmChartsSection, WorkspaceOrgChartsSection } from "@/components/workspace/dashboard/DynamicWorkspaceCharts";
import {
  RecentLeadsTable, TeamPerformanceTable, TeamPerformanceByStreamTable, RecentActivityTable,
  UpcomingAnniversariesTable, RecentLoginsTable,
  MissingDocumentsTable, PendingApprovalDocumentsTable, ExpiringDocumentsTable, RecentlyUploadedDocumentsTable,
} from "@/components/workspace/dashboard/WorkspaceTables";

export default async function DashboardPage({ searchParams }) {
  const session = await getSession();
  const isChildCompany = session.is_child_company;
  // GVE's own dashboard shows every school's leads combined instead of
  // GVE's own (near-empty) company data — same gate as the Leads page's
  // own isAggregated branch.
  const isGveParent = !isChildCompany && !!session.can_create_child_companies;
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
  const hour12 = systemSettings.time_format !== "24h";
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
    teamPerformance, recentLeads, schoolsOverview, orgStats, anniversaries, recentLogins,
    employeeGrowth, departmentDistribution, roleDistribution, documentTrend,
    recentActivity, unreadNotifications, branding, announcement, parentAnnouncement,
    missingDocsEmployees, pendingDocs, expiringDocs, recentDocs, storageUsage,
    employeePayments, superAdminPayments, subscriptionDetails, subscriptionPayments,
    schoolCompany, parentCompany,
  ] = await Promise.all([
    getDashboardStats(session),
    isGveParent ? getAggregatedLeadDashboardStats(session) : getLeadDashboardStats(session),
    isGveParent ? getAggregatedLeadsBySource(session) : getLeadsBySource(session),
    isGveParent ? getAggregatedLeadsByService(session) : getLeadsByService(session),
    isGveParent ? getAggregatedLeadsByStage(session) : getLeadsByStage(session),
    getMonthlyLeadTrend(session, range),
    isChildCompany ? getTeamPerformanceByStream(session) : getTeamPerformance(session),
    isGveParent ? listAggregatedSchoolLeads(session, { pageSize: 6 }).then((r) => r.leads) : getRecentLeads(session, 6),
    isGveParent ? getSchoolsOverview(session) : Promise.resolve(null),
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
    getLatestAnnouncement(session),
    getLatestParentAnnouncement(session),
    canManageDocuments ? getEmployeesWithMissingDocuments(session) : [],
    canManageDocuments ? getPendingApprovalDocuments(session) : [],
    canManageDocuments ? getExpiringDocuments(session) : [],
    canManageDocuments ? getRecentlyUploadedDocuments(session) : [],
    getStorageUsage(session),
    paymentsEnabled ? getEmployeePaymentDashboard(session) : null,
    paymentsEnabled && isAdmin ? getSuperAdminPaymentDashboard(session) : null,
    isAdmin ? getSubscriptionDetails(session.company_id) : null,
    isAdmin ? listSubscriptionPayments(session) : [],
    isChildCompany ? getCurrentCompany(session.company_id) : null,
    isChildCompany && session.parent_company_id ? getCurrentCompany(session.parent_company_id) : null,
  ]);

  // Platform subscription billing — what THIS company has paid the
  // platform, not to be confused with the "Payments" section above (money
  // this company collects from its own leads). Only shown once a real
  // completed payment exists.
  const completedPayments = subscriptionPayments.filter((p) => p.status === "completed");
  const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const lastPayment = completedPayments[0] || null; // already ORDER BY created_at DESC

  // GVE's own dashboard is deliberately tighter than every other
  // company's — fewer, more collapsed sections, since it's an overview
  // dashboard for an org that doesn't run its own day-to-day leads.
  const outerGap = isGveParent ? "space-y-5" : "space-y-8";
  const sectionGap = isGveParent ? "space-y-3" : "space-y-4";
  const gridGap = isGveParent ? "gap-3" : "gap-4";

  return (
    <div className={outerGap}>
      {isChildCompany && schoolCompany && <SchoolBanner companyName={schoolCompany.name} logoUrl={branding.sidebarLogoUrl || branding.logoUrl} parentCompanyName={parentCompany?.name} />}
      {parentAnnouncement && <AnnouncementBanner announcement={parentAnnouncement} label={parentAnnouncement.companyName || "Parent Company"} accent="indigo" />}
      <AnnouncementBanner announcement={announcement} />

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

      <section className={sectionGap}>
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">CRM Overview</p>
        <CrmKpiGrid crm={crmStats} isChildCompany={isChildCompany} schoolCount={isGveParent ? schoolsOverview?.schools?.length ?? 0 : null} compact={isGveParent} />
        {!isChildCompany && (() => {
          const charts = (
            <WorkspaceCrmChartsSection
              monthlyLeads={monthlyLeads} leadsByStage={leadsByStage} leadsBySource={leadsBySource} leadsByService={leadsByService}
              isGveParent={isGveParent} leadsBySchool={schoolsOverview?.schools?.filter((s) => s.leadCount > 0)}
            />
          );
          return isGveParent ? (
            <CollapsibleSection title="Charts" persistKey="gve-dashboard-charts">{charts}</CollapsibleSection>
          ) : charts;
        })()}
        {isChildCompany ? (
          <TeamPerformanceByStreamTable team={teamPerformance} />
        ) : (() => {
          const recent = (
            <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap}`}>
              <RecentLeadsTable leads={recentLeads} aggregated={isGveParent} homeCompanyId={session.home_company_id} gveCompanyId={session.company_id} />
              <TeamPerformanceTable team={teamPerformance} />
            </div>
          );
          return isGveParent ? (
            <CollapsibleSection title="Recent Leads & Team Performance" persistKey="gve-dashboard-recent-leads">{recent}</CollapsibleSection>
          ) : recent;
        })()}
      </section>

      {isAdmin && subscriptionDetails?.hasSubscription && (() => {
        const subscriptionBlock = (
          <SubscriptionKpiGrid
            planName={subscriptionDetails?.planName}
            state={subscriptionDetails?.state}
            daysRemaining={subscriptionDetails?.daysRemaining}
            cancelAtPeriodEnd={subscriptionDetails?.cancelAtPeriodEnd}
            totalPaid={totalPaid}
            currency={lastPayment?.currency || subscriptionDetails?.currency || "INR"}
            lastPaymentAmount={lastPayment?.amount}
            lastPaymentDate={lastPayment ? formatDate(lastPayment.created_at, timezone) : null}
            gateway={lastPayment?.gateway}
          />
        );
        return isGveParent ? (
          <CollapsibleSection title="Subscription & Billing" persistKey="gve-dashboard-subscription">{subscriptionBlock}</CollapsibleSection>
        ) : (
          <section className="space-y-4">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Subscription & Billing</p>
            {subscriptionBlock}
          </section>
        );
      })()}

      {/* For GVE specifically, employees don't run their own payment
          collection the way a school's counsellors do — admin-only there,
          same as the "Company-Wide (Super Admin)" breakdown always was. */}
      {!isChildCompany && paymentsEnabled && employeePayments && (!isGveParent || isAdmin) && (() => {
        const paymentsBlock = (
          <>
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
          </>
        );
        return isGveParent ? (
          <CollapsibleSection title="Payments" persistKey="gve-dashboard-payments">{paymentsBlock}</CollapsibleSection>
        ) : (
          <section className="space-y-4">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Payments</p>
            {paymentsBlock}
          </section>
        );
      })()}

      {isChildCompany ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CollapsibleLogGroup persistKey="dashboard-recent-activity" title="Recent Activity" logs={recentActivity} timezone={timezone} hour12={hour12} />
          <RecentLoginsTable logins={recentLogins} timezone={timezone} />
        </div>
      ) : (() => {
        const orgBlock = (
          <>
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
            <div className={`grid grid-cols-1 lg:grid-cols-3 ${gridGap}`}>
              <RecentActivityTable logs={recentActivity} timezone={timezone} />
              <UpcomingAnniversariesTable people={anniversaries} />
              <RecentLoginsTable logins={recentLogins} timezone={timezone} />
            </div>
          </>
        );
        return isGveParent ? (
          <CollapsibleSection title="Organization Overview" persistKey="gve-dashboard-org-overview">{orgBlock}</CollapsibleSection>
        ) : (
          <section className={sectionGap}>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Organization Overview</p>
            {orgBlock}
          </section>
        );
      })()}

      {!isChildCompany && canManageDocuments && (() => {
        const docsBlock = (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MissingDocumentsTable employees={missingDocsEmployees} />
            <PendingApprovalDocumentsTable documents={pendingDocs} />
            <ExpiringDocumentsTable documents={expiringDocs} timezone={timezone} />
            <RecentlyUploadedDocumentsTable documents={recentDocs} timezone={timezone} />
            <StorageUsageWidget usage={storageUsage} />
          </div>
        );
        return isGveParent ? (
          <CollapsibleSection title="Employee Documents" persistKey="gve-dashboard-employee-documents">{docsBlock}</CollapsibleSection>
        ) : (
          <section className="space-y-4">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Employee Documents</p>
            {docsBlock}
          </section>
        );
      })()}

      {!isChildCompany && !isGveParent && <QuickActionsCard isChildCompany={isChildCompany} />}
    </div>
  );
}
