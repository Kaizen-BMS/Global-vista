import { getSession } from "@/lib/auth";
import { getSubscriptionDetails, getUsageCounts } from "@/lib/platform/tenant";
import { getStorageUsage, formatBytes } from "@/lib/actions/storage";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { formatDate } from "@/lib/helpers/dateFormat";
import SettingsTabs from "@/components/shared/SettingsTabs";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Users, Contact2 } from "lucide-react";

const STATE_META = {
  active: { label: "Active", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  trial: { label: "Trial", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30", icon: Clock },
  expired: { label: "Expired", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
  no_subscription: { label: "No Subscription", color: "text-muted-foreground bg-muted/20 border-border/30", icon: AlertTriangle },
};

export default async function SubscriptionSettingsPage() {
  const session = await getSession();
  const [subscription, storage, systemSettings, usage] = await Promise.all([
    getSubscriptionDetails(session.company_id), getStorageUsage(session), getSettingsByGroup(session, "system"), getUsageCounts(session.company_id),
  ]);
  const timezone = systemSettings.timezone || "UTC";
  const meta = STATE_META[subscription.state] || STATE_META.no_subscription;
  const Icon = meta.icon;

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
      <SettingsTabs />

      {!subscription.hasSubscription ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto mb-2" />
          <p className="text-foreground text-sm">No subscription is configured for this company yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Contact your platform administrator.</p>
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
              {subscription.maxUsers && <div className="flex justify-between"><span className="text-muted-foreground">User Limit</span><span className="text-foreground">{subscription.maxUsers}</span></div>}
              {subscription.maxLeads && <div className="flex justify-between"><span className="text-muted-foreground">Lead Limit</span><span className="text-foreground">{subscription.maxLeads}</span></div>}
            </div>
            {subscription.daysRemaining != null && subscription.daysRemaining <= 30 && subscription.daysRemaining >= 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-amber-400 text-xs mb-2">Your plan expires {subscription.daysRemaining === 0 ? "today" : subscription.daysRemaining === 1 ? "tomorrow" : `in ${subscription.daysRemaining} days`}. Renew or upgrade your subscription to continue using the platform.</p>
                <span className="inline-block px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs">Contact Platform Admin</span>
              </div>
            )}
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
