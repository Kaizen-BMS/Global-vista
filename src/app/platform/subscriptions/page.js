import { listSubscriptions, listPlansForAdmin, listAllPlanModules } from "@/lib/platform/actions/subscriptions";
import { listAllModules } from "@/lib/platform/actions/companies";
import { getPlatformTimezone } from "@/lib/platform/actions/settings";
import SubscriptionsTable from "@/components/platform/SubscriptionsTable";
import PlansManager from "@/components/platform/PlansManager";

export default async function PlatformSubscriptionsPage() {
  const [subscriptions, plans, timezone, allModules, planModulesByPlan] = await Promise.all([
    listSubscriptions(), listPlansForAdmin(), getPlatformTimezone(), listAllModules(), listAllPlanModules(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Subscriptions</h1>
        <p className="text-muted-foreground text-sm">Manage every tenant's plan, billing period, and storage allowance.</p>
      </div>
      <SubscriptionsTable subscriptions={subscriptions} plans={plans} timezone={timezone} />
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Plans</h2>
        <p className="text-muted-foreground text-sm mb-4">Configure the plans available to assign to companies.</p>
        <PlansManager plans={plans} allModules={allModules} planModulesByPlan={planModulesByPlan} />
      </div>
    </div>
  );
}
