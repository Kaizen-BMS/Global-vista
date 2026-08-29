"use client";
import {
  CompanyGrowthChart, LoginActivityChart, ProvisioningHistoryChart,
  ModuleUsageChart, PlanDistributionChart, SubscriptionStatusChart, RevenueTrendChart,
} from "@/components/platform/dashboard/PlatformCharts";

export function PlatformChartsGrid({ charts }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RevenueTrendChart data={charts.revenueTrend} currencies={charts.revenueCurrencies} />
      <CompanyGrowthChart data={charts.companyGrowth} />
      <LoginActivityChart data={charts.loginActivity} />
      <ProvisioningHistoryChart data={charts.provisioningHistory} />
      <ModuleUsageChart data={charts.moduleUsage} />
      <PlanDistributionChart data={charts.planDistribution} />
      <SubscriptionStatusChart data={charts.subscriptionStatus} />
    </div>
  );
}
