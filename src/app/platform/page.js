import { getPlatformDashboard, resolveRange } from "@/lib/platform/actions/dashboard";
import KpiGrid from "@/components/platform/dashboard/KpiGrid";
import RangeFilter from "@/components/platform/dashboard/RangeFilter";
import {
  CompanyGrowthChart, LoginActivityChart, ProvisioningHistoryChart,
  ModuleUsageChart, PlanDistributionChart, SubscriptionStatusChart,
} from "@/components/platform/dashboard/PlatformCharts";
import {
  RecentCompaniesTable, RecentSubscriptionsTable, LatestPaymentsTable,
  LatestErrorsTable, RecentPlatformEventsTable,
} from "@/components/platform/dashboard/DashboardTables";

export default async function PlatformDashboard({ searchParams }) {
  const sp = await searchParams;
  const range = sp?.range || "month";
  const { start, end, label } = resolveRange(range, sp?.from, sp?.to);
  const { kpis, charts, tables } = await getPlatformDashboard({ start, end });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Platform Dashboard</h1>
          <p className="text-neutral-500 text-sm">Executive overview across every tenant · {label}</p>
        </div>
        <RangeFilter active={range} from={sp?.from} to={sp?.to} />
      </div>

      <KpiGrid kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CompanyGrowthChart data={charts.companyGrowth} />
        <LoginActivityChart data={charts.loginActivity} />
        <ProvisioningHistoryChart data={charts.provisioningHistory} />
        <ModuleUsageChart data={charts.moduleUsage} />
        <PlanDistributionChart data={charts.planDistribution} />
        <SubscriptionStatusChart data={charts.subscriptionStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentCompaniesTable companies={tables.recentCompanies} />
        <RecentSubscriptionsTable subscriptions={tables.recentSubscriptions} />
        <LatestPaymentsTable />
        <LatestErrorsTable errors={tables.recentErrors} />
        <RecentPlatformEventsTable events={tables.recentPlatformEvents} />
      </div>
    </div>
  );
}
