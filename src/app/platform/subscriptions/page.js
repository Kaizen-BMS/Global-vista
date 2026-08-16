import { listSubscriptions, listPlansForAdmin, listAllPlanModules } from "@/lib/platform/actions/subscriptions";
import { listAllModules } from "@/lib/platform/actions/companies";
import { getPlatformTimezone } from "@/lib/platform/actions/settings";
import { getSubscriptionBillingStats } from "@/lib/platform/actions/subscriptionBilling";
import SubscriptionsTable from "@/components/platform/SubscriptionsTable";
import PlansManager from "@/components/platform/PlansManager";
import StatCard from "@/components/crm/cards/StatCard";
import { IndianRupee, Clock, AlertTriangle, XCircle } from "lucide-react";

export default async function PlatformSubscriptionsPage() {
  const [subscriptions, plans, timezone, allModules, planModulesByPlan, billingStats] = await Promise.all([
    listSubscriptions(), listPlansForAdmin(), getPlatformTimezone(), listAllModules(), listAllPlanModules(), getSubscriptionBillingStats(),
  ]);

  const revenueLabel = billingStats.revenueByCurrency.length === 0
    ? "0"
    : billingStats.revenueByCurrency.map((r) => `${r.currency} ${Number(r.total).toLocaleString()}`).join(" + ");
  const gatewayBreakdown = billingStats.byGateway.map((g) => `${g.gateway}: ${g.count}`).join(", ") || "None yet";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Subscriptions</h1>
        <p className="text-muted-foreground text-sm">Manage every tenant's plan, billing period, and storage allowance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Collected Revenue" value={revenueLabel} icon={IndianRupee} accent="green" />
        <StatCard label="Pending Payments" value={billingStats.pendingCount} icon={Clock} accent="yellow" />
        <StatCard label="Past Due" value={billingStats.pastDueCount} icon={AlertTriangle} accent="yellow" />
        <StatCard label="Failed Payments" value={billingStats.failedPaymentsCount} icon={XCircle} accent="indigo" />
      </div>
      <p className="text-muted-foreground text-xs -mt-6">Gateway-billed subscriptions: {gatewayBreakdown}</p>

      <SubscriptionsTable subscriptions={subscriptions} plans={plans} timezone={timezone} />
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Plans</h2>
        <p className="text-muted-foreground text-sm mb-4">Configure the plans available to assign to companies.</p>
        <PlansManager plans={plans} allModules={allModules} planModulesByPlan={planModulesByPlan} />
      </div>
    </div>
  );
}
