import { getPlatformDashboard, resolveRange } from "@/lib/platform/actions/dashboard";
import { getPlatformTimezone } from "@/lib/platform/actions/settings";
import KpiGrid from "@/components/platform/dashboard/KpiGrid";
import RangeFilter from "@/components/shared/RangeFilter";
import { PlatformChartsGrid } from "@/components/platform/dashboard/DynamicPlatformCharts";
import {
  RecentCompaniesTable, RecentSubscriptionsTable, LatestPaymentsTable,
  LatestErrorsTable, RecentPlatformEventsTable,
} from "@/components/platform/dashboard/DashboardTables";

export default async function PlatformDashboard({ searchParams }) {
  const sp = await searchParams;
  const range = sp?.range || "month";
  const { start, end, label } = resolveRange(range, sp?.from, sp?.to);
  const [{ kpis, charts, tables }, timezone] = await Promise.all([getPlatformDashboard({ start, end }), getPlatformTimezone()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Platform Dashboard</h1>
          <p className="text-muted-foreground text-sm">Executive overview across every tenant · {label}</p>
        </div>
        <RangeFilter active={range} from={sp?.from} to={sp?.to} />
      </div>

      <KpiGrid kpis={kpis} />

      <PlatformChartsGrid charts={charts} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentCompaniesTable companies={tables.recentCompanies} timezone={timezone} />
        <RecentSubscriptionsTable subscriptions={tables.recentSubscriptions} timezone={timezone} />
        <LatestPaymentsTable />
        <LatestErrorsTable errors={tables.recentErrors} timezone={timezone} />
        <RecentPlatformEventsTable events={tables.recentPlatformEvents} timezone={timezone} />
      </div>
    </div>
  );
}
