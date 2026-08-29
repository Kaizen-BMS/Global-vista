import { getSession } from "@/lib/auth";
import { getPlatformDashboard, resolveRange } from "@/lib/platform/actions/dashboard";
import { getSupportTicketStats } from "@/lib/platform/actions/supportTickets";
import { getPlatformTimezone } from "@/lib/platform/actions/settings";
import KpiGrid from "@/components/platform/dashboard/KpiGrid";
import RangeFilter from "@/components/shared/RangeFilter";
import { PlatformChartsGrid } from "@/components/platform/dashboard/DynamicPlatformCharts";
import {
  RecentCompaniesTable, RecentSubscriptionsTable, LatestPaymentsTable,
  LatestErrorsTable, RecentPlatformEventsTable,
} from "@/components/platform/dashboard/DashboardTables";

export default async function PlatformDashboard({ searchParams }) {
  const session = await getSession();
  const sp = await searchParams;
  const range = sp?.range || "month";
  const timezone = await getPlatformTimezone();
  const { start, end, label } = resolveRange(range, sp?.from, sp?.to, {
    timeZone: timezone, quarter: sp?.quarter, qyear: sp?.qyear, years: sp?.years,
  });
  const [{ kpis, charts, tables }, supportStats] = await Promise.all([
    getPlatformDashboard({ start, end }),
    getSupportTicketStats(session),
  ]);
  kpis.openSupportTickets = supportStats.open;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Platform Dashboard</h1>
          <p className="text-muted-foreground text-sm">Executive overview across every tenant · {label}</p>
        </div>
        <RangeFilter
          active={range} from={sp?.from} to={sp?.to}
          quarter={sp?.quarter ? Number(sp.quarter) : undefined} qyear={sp?.qyear ? Number(sp.qyear) : undefined} years={sp?.years ? Number(sp.years) : undefined}
          rangeStart={start} rangeEnd={end} timezone={timezone}
        />
      </div>

      <KpiGrid kpis={kpis} />

      <PlatformChartsGrid charts={charts} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentCompaniesTable companies={tables.recentCompanies} timezone={timezone} />
        <RecentSubscriptionsTable subscriptions={tables.recentSubscriptions} timezone={timezone} />
        <LatestPaymentsTable payments={tables.latestPayments} timezone={timezone} />
        <LatestErrorsTable errors={tables.recentErrors} timezone={timezone} />
        <RecentPlatformEventsTable events={tables.recentPlatformEvents} timezone={timezone} />
      </div>
    </div>
  );
}
