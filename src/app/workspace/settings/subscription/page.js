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
import { Kpi } from "@/components/workspace/dashboard/KpiGrid";
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, Ban, Users, Contact2,
  CalendarDays, CreditCard, RefreshCcw, Sparkles, UserCog, HardDrive, Gauge,
} from "lucide-react";

const STATE_META = {
  active: { label: "Active", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2, kpiAccent: "green" },
  trial: { label: "Trial", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30", icon: Clock, kpiAccent: "indigo" },
  pending: { label: "Pending Payment", color: "text-sky-400 bg-sky-500/10 border-sky-500/30", icon: Clock, kpiAccent: "blue" },
  past_due: { label: "Past Due", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: AlertTriangle, kpiAccent: "yellow" },
  payment_failed: { label: "Payment Failed", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle, kpiAccent: "red" },
  suspended: { label: "Suspended", color: "text-orange-400 bg-orange-500/10 border-orange-500/30", icon: Ban, kpiAccent: "yellow" },
  expired: { label: "Expired", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle, kpiAccent: "red" },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle, kpiAccent: "red" },
  no_subscription: { label: "No Subscription", color: "text-muted-foreground bg-muted/20 border-border/30", icon: AlertTriangle, kpiAccent: "neutral" },
};

/** One label+value line inside a card — same info the page always showed,
 * just with an icon and consistent spacing instead of a bare flex row. */
function InfoRow({ icon: Icon, label, value, valueClass = "text-foreground" }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><Icon className="h-3.5 w-3.5 shrink-0" /> {label}</span>
      <span className={`text-sm font-medium text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

/** A small icon-in-chip section header, matching the accent-chip language
 * the rest of the app's KPI tiles already use. */
function SectionHeader({ icon: Icon, title, accent, right }) {
  const chip = { indigo: "text-indigo-400 bg-indigo-500/10", blue: "text-sky-400 bg-sky-500/10", green: "text-emerald-400 bg-emerald-500/10" }[accent] || "text-indigo-400 bg-indigo-500/10";
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${chip}`}><Icon className="h-4 w-4" /></span>
        <p className="text-foreground font-medium">{title}</p>
      </div>
      {right}
    </div>
  );
}

/** Meter contract: the fill carries severity (accent -> warning ->
 * danger); the unfilled track is a lighter step of that SAME hue (never a
 * flat neutral gray) so the whole bar — not just the fill — reads as
 * healthy/warning/critical at a glance. */
const METER_TONE = {
  accent: { fill: "bg-indigo-500", track: "bg-indigo-500/15" },
  warning: { fill: "bg-amber-500", track: "bg-amber-500/15" },
  danger: { fill: "bg-red-500", track: "bg-red-500/15" },
};
function toneFor(percent) {
  if (percent == null) return "accent";
  return percent >= 100 ? "danger" : percent >= 90 ? "warning" : "accent";
}
function Meter({ percent }) {
  const tone = METER_TONE[toneFor(percent)];
  return (
    <div className={`h-2 rounded-full overflow-hidden ${tone.track}`}>
      <div className={`h-full rounded-full transition-all ${tone.fill}`} style={{ width: `${Math.min(100, percent ?? 0)}%` }} />
    </div>
  );
}

/** A small colored banner for a status message — same exact copy/logic
 * every message below always had, just given an icon + tinted background
 * instead of a bare line of colored text. */
function StatusBanner({ tone, icon: Icon, children }) {
  const styles = {
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  };
  return (
    <div className={`flex items-start gap-2 text-xs rounded-lg border px-3 py-2.5 mt-3 ${styles[tone]}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  );
}

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

  // Top stat-tile row — same fields the "Plan" card already lists below,
  // surfaced as a glanceable summary. Only ever built from values that
  // already exist (same conditions the detail rows use), never a
  // fabricated/estimated figure.
  const topTiles = subscription.hasSubscription ? [
    { label: "Plan", value: subscription.planName, icon: "calendarCheck", accent: meta.kpiAccent, hint: meta.label },
    subscription.daysRemaining != null ? {
      label: "Days Remaining", value: `${Math.max(0, subscription.daysRemaining)}`, icon: "calendar",
      accent: subscription.daysRemaining <= 7 ? "yellow" : "indigo",
      hint: subscription.cancelAtPeriodEnd ? "won't renew" : null,
    } : null,
    subscription.price != null ? {
      label: "Price", value: subscription.price ? `${subscription.currency} ${subscription.price}` : "Free", icon: "card", accent: "blue",
      hint: subscription.billingCycle ? subscription.billingCycle : null,
    } : null,
    subscription.nextBillingAt ? { label: "Next Billing", value: formatDate(subscription.nextBillingAt, timezone), icon: "receipt", accent: "purple" } : null,
  ].filter(Boolean) : [];

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
        <>
          {topTiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {topTiles.map((t) => <Kpi key={t.label} {...t} />)}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-foreground font-medium">{subscription.planName} Plan</p>
                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${meta.color}`}><Icon className="h-3.5 w-3.5" />{meta.label}</span>
              </div>
              <div>
                <InfoRow icon={CalendarDays} label="Start Date" value={formatDate(subscription.startsAt, timezone)} />
                <InfoRow icon={CalendarDays} label="Expiry Date" value={subscription.endsAt ? formatDate(subscription.endsAt, timezone) : "No expiry"} />
                {subscription.daysRemaining != null && (
                  <InfoRow
                    icon={Clock} label="Days Remaining"
                    value={`${Math.max(0, subscription.daysRemaining)} day${subscription.daysRemaining === 1 ? "" : "s"}`}
                    valueClass={subscription.daysRemaining <= 7 ? "text-amber-400" : "text-foreground"}
                  />
                )}
                {subscription.price != null && <InfoRow icon={CreditCard} label="Price" value={subscription.price ? `${subscription.currency} ${subscription.price}` : "Free"} />}
                {!!subscription.price && subscription.billingCycle && <InfoRow icon={RefreshCcw} label="Billing Cycle" value={<span className="capitalize">{subscription.billingCycle}</span>} />}
                {subscription.nextBillingAt && <InfoRow icon={RefreshCcw} label="Next Billing Date" value={formatDate(subscription.nextBillingAt, timezone)} />}
                {!!subscription.trialDays && subscription.isTrial && <InfoRow icon={Sparkles} label="Trial" value={`${subscription.trialDays} days`} />}
                {subscription.maxUsers && <InfoRow icon={UserCog} label="User Limit" value={subscription.maxUsers} />}
                {subscription.maxLeads && <InfoRow icon={Contact2} label="Lead Limit" value={subscription.maxLeads} />}
              </div>

              {subscription.daysRemaining != null && subscription.daysRemaining <= 30 && subscription.daysRemaining >= 0 && (
                <StatusBanner tone="amber" icon={AlertTriangle}>
                  Your plan expires {subscription.daysRemaining === 0 ? "today" : subscription.daysRemaining === 1 ? "tomorrow" : `in ${subscription.daysRemaining} days`}.
                </StatusBanner>
              )}
              {subscription.state === "pending" && (
                <StatusBanner tone="sky" icon={Clock}>A checkout was started but hasn't been confirmed yet. Use Upgrade / Change Plan below to complete payment.</StatusBanner>
              )}
              {subscription.state === "past_due" && (
                <StatusBanner tone="amber" icon={AlertTriangle}>BillDesk reported a payment issue — please retry payment to avoid interruption.</StatusBanner>
              )}
              {subscription.state === "payment_failed" && (
                <StatusBanner tone="red" icon={XCircle}>Your last payment failed. Please retry payment below.</StatusBanner>
              )}
              {subscription.cancelAtPeriodEnd && (
                <StatusBanner tone="amber" icon={Ban}>Cancelled — won&apos;t renew. You&apos;ll keep full access until {formatDate(subscription.endsAt, timezone)}.</StatusBanner>
              )}
              {subscription.pendingPlanName && (
                <StatusBanner tone="indigo" icon={RefreshCcw}>
                  Switching to &quot;{subscription.pendingPlanName}&quot; on {formatDate(subscription.endsAt, timezone)} — your current plan stays active until then.
                </StatusBanner>
              )}

              {canManage && <SubscriptionManager subscription={subscription} plans={plans} payments={payments} canResume={canResume} billDeskStatus={billDeskStatus} autoCheckout={autoCheckout} />}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <SectionHeader
                icon={HardDrive} title="Storage" accent="blue"
                right={storage.limitBytes != null && <span className="text-xs font-medium text-muted-foreground">{Math.min(100, storage.percentUsed)}%</span>}
              />
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-foreground font-medium">{formatBytes(storage.usedBytes)}</span>
                  <span className="text-muted-foreground">{storage.limitBytes != null ? formatBytes(storage.limitBytes) : "Unlimited"}</span>
                </div>
                {storage.limitBytes != null && <Meter percent={storage.percentUsed} />}
              </div>
              {storage.percentUsed != null && storage.percentUsed >= 80 && (
                <StatusBanner tone={storage.percentUsed >= 100 ? "red" : "amber"} icon={AlertTriangle}>
                  {storage.percentUsed >= 100 ? "Storage limit reached." : `Storage usage is at ${storage.percentUsed}%.`}
                </StatusBanner>
              )}
              <div className="mt-4 pt-4 border-t border-border/60 space-y-2 text-xs">
                {storage.byModule.map((m) => (
                  <div key={m.module} className="flex justify-between text-muted-foreground"><span>{m.module}</span><span className="text-foreground font-medium">{formatBytes(m.bytes)}</span></div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <SectionHeader icon={Gauge} title="Usage" accent="indigo" />
              <UsageBar icon={Users} label="Users" used={usage.userCount} limit={subscription.maxUsers} />
              <div className="mt-4">
                <UsageBar icon={Contact2} label="Leads" used={usage.leadCount} limit={subscription.maxLeads} />
              </div>
            </div>
          </div>
        </>
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
      {percent != null && <Meter percent={percent} />}
    </div>
  );
}
