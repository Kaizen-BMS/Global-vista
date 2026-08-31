import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { getSubscriptionDetails, getUsageCounts } from "@/lib/platform/tenant";
import { getStorageUsage, formatBytes } from "@/lib/actions/storage";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { listPublicPlans } from "@/lib/platform/actions/registration";
import { listSubscriptionPayments } from "@/lib/platform/actions/subscriptionBilling";
import { getBillDeskStatus } from "@/lib/payments/providers";
import { formatDate } from "@/lib/helpers/dateFormat";
import SettingsTabs from "@/components/shared/SettingsTabs";
import SubscriptionManager from "@/components/crm/settings/SubscriptionManager";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Ban, Users, Contact2 } from "lucide-react";

const STATE_META = {
  active: { label: "Active", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  trial: { label: "Trial", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30", icon: Clock },
  pending: { label: "Pending Payment", color: "text-sky-400 bg-sky-500/10 border-sky-500/30", icon: Clock },
  past_due: { label: "Past Due", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  payment_failed: { label: "Payment Failed", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
  suspended: { label: "Suspended", color: "text-orange-400 bg-orange-500/10 border-orange-500/30", icon: Ban },
  expired: { label: "Expired", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
  no_subscription: { label: "No Subscription", color: "text-muted-foreground bg-muted/20 border-border/30", icon: AlertTriangle },
};

export default async function SubscriptionSettingsPage({ searchParams }) {
  const session = await getSession();
  const sp = await searchParams;
  // Arriving from the public pricing page's "Choose Plan"/"Upgrade" CTA —
  // see SubscriptionManager's own handling of these two params, which
  // fires the real checkout the moment this page loads instead of making
  // the visitor click through the plan picker again.
  const autoCheckout = sp?.checkoutPlan ? { planId: Number(sp.checkoutPlan), months: Number(sp.checkoutMonths) || 1 } : null;
  const [subscription, storage, systemSettings, usage, plans, payments, billDeskStatus] = await Promise.all([
    getSubscriptionDetails(session.company_id), getStorageUsage(session), getSettingsByGroup(session, "system"), getUsageCounts(session.company_id),
    listPublicPlans(), isSuperAdmin(session) ? listSubscriptionPayments(session) : [],
    getBillDeskStatus(),
  ]);
  const timezone = systemSettings.timezone || "UTC";
  const meta = STATE_META[subscription.state] || STATE_META.no_subscription;
  const Icon = meta.icon;
  const canManage = isSuperAdmin(session);
  const canResume = canManage && subscription.state === "suspended" && subscription.gateway === "billdesk";

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1 whitespace-nowrap">Subscription</h1>
      <SettingsTabs />

      {!subscription.hasSubscription ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto mb-2" />
          <p className="text-foreground text-sm">No subscription is configured for this company yet.</p>
          {canManage ? (
            <div className="mt-3 flex justify-center"><SubscriptionManager subscription={subscription} plans={plans} payments={payments} canResume={false} billDeskStatus={billDeskStatus} autoCheckout={autoCheckout} /></div>
          ) : (
            <p className="text-muted-foreground text-xs mt-1">Contact your Company Super Admin.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-foreground font-medium">{subscription.planName} Plan</p>
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${meta.color}`}><Icon className="h-3.5 w-3.5" />{meta.label}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Start Date</span><span className="text-foreground">{formatDate(subscription.startsAt, timezone)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expiry Date</span><span className="text-foreground">{subscription.endsAt ? formatDate(subscription.endsAt, timezone) : "No expiry"}</span></div>
              {subscription.daysRemaining != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days Remaining</span>
                  <span className={subscription.daysRemaining <= 7 ? "text-amber-400" : "text-foreground"}>{Math.max(0, subscription.daysRemaining)} day{subscription.daysRemaining === 1 ? "" : "s"}</span>
                </div>
              )}
              {subscription.price != null && <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="text-foreground">{subscription.price ? `${subscription.currency} ${subscription.price}` : "Free"}</span></div>}
              {!!subscription.price && subscription.billingCycle && <div className="flex justify-between"><span className="text-muted-foreground">Billing Cycle</span><span className="text-foreground capitalize">{subscription.billingCycle}</span></div>}
              {subscription.nextBillingAt && <div className="flex justify-between"><span className="text-muted-foreground">Next Billing Date</span><span className="text-foreground">{formatDate(subscription.nextBillingAt, timezone)}</span></div>}
              {!!subscription.trialDays && subscription.isTrial && <div className="flex justify-between"><span className="text-muted-foreground">Trial</span><span className="text-foreground">{subscription.trialDays} days</span></div>}
              {subscription.maxUsers && <div className="flex justify-between"><span className="text-muted-foreground">User Limit</span><span className="text-foreground">{subscription.maxUsers}</span></div>}
              {subscription.maxLeads && <div className="flex justify-between"><span className="text-muted-foreground">Lead Limit</span><span className="text-foreground">{subscription.maxLeads}</span></div>}
            </div>
            {subscription.daysRemaining != null && subscription.daysRemaining <= 30 && subscription.daysRemaining >= 0 && (
              <p className="text-amber-400 text-xs mt-4 pt-4 border-t border-border">
                Your plan expires {subscription.daysRemaining === 0 ? "today" : subscription.daysRemaining === 1 ? "tomorrow" : `in ${subscription.daysRemaining} days`}.
              </p>
            )}
            {subscription.state === "pending" && <p className="text-sky-400 text-xs mt-4 pt-4 border-t border-border">A checkout was started but hasn't been confirmed yet. Use Upgrade / Change Plan below to complete payment.</p>}
            {subscription.state === "past_due" && <p className="text-amber-400 text-xs mt-4 pt-4 border-t border-border">BillDesk reported a payment issue — please retry payment to avoid interruption.</p>}
            {subscription.state === "payment_failed" && <p className="text-red-400 text-xs mt-4 pt-4 border-t border-border">Your last payment failed. Please retry payment below.</p>}
            {subscription.cancelAtPeriodEnd && (
              <p className="text-amber-400 text-xs mt-4 pt-4 border-t border-border">
                Cancelled — won't renew. You'll keep full access until {formatDate(subscription.endsAt, timezone)}.
              </p>
            )}
            {subscription.pendingPlanName && (
              <p className="text-indigo-400 text-xs mt-4 pt-4 border-t border-border">
                Switching to "{subscription.pendingPlanName}" on {formatDate(subscription.endsAt, timezone)} — your current plan stays active until then.
              </p>
            )}
            {canManage && <SubscriptionManager subscription={subscription} plans={plans} payments={payments} canResume={canResume} billDeskStatus={billDeskStatus} autoCheckout={autoCheckout} />}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-foreground font-medium mb-4">Storage</p>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-foreground">{formatBytes(storage.usedBytes)}</span>
                <span className="text-muted-foreground">{storage.limitBytes != null ? formatBytes(storage.limitBytes) : "Unlimited"}</span>
              </div>
              {storage.limitBytes != null && (
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${storage.percentUsed >= 100 ? "bg-red-500" : storage.percentUsed >= 90 ? "bg-amber-500" : "bg-indigo-500"}`}
                    style={{ width: `${Math.min(100, storage.percentUsed)}%` }}
                  />
                </div>
              )}
            </div>
            {storage.percentUsed != null && storage.percentUsed >= 80 && (
              <p className={`text-xs mt-2 ${storage.percentUsed >= 100 ? "text-red-400" : "text-amber-400"}`}>
                {storage.percentUsed >= 100 ? "Storage limit reached." : `Storage usage is at ${storage.percentUsed}%.`}
              </p>
            )}
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              {storage.byModule.map((m) => (
                <div key={m.module} className="flex justify-between"><span>{m.module}</span><span>{formatBytes(m.bytes)}</span></div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-foreground font-medium mb-4">Usage</p>
            <UsageBar icon={Users} label="Users" used={usage.userCount} limit={subscription.maxUsers} />
            <div className="mt-4">
              <UsageBar icon={Contact2} label="Leads" used={usage.leadCount} limit={subscription.maxLeads} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsageBar({ icon: Icon, label, used, limit }) {
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : null;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="flex items-center gap-1.5 text-foreground"><Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}</span>
        <span className="text-muted-foreground">{used.toLocaleString()} {limit ? `/ ${Number(limit).toLocaleString()}` : "(Unlimited)"}</span>
      </div>
      {percent != null && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all ${percent >= 100 ? "bg-red-500" : percent >= 90 ? "bg-amber-500" : "bg-indigo-500"}`} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
