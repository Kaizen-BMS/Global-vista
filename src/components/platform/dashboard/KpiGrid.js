import Link from "next/link";
import {
  Building2, CheckCircle2, Clock, XCircle, DollarSign, TrendingUp,
  Users, UserCog, Contact2, HardDrive, Package, Sparkles,
  AlertTriangle, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { formatMoney } from "@/lib/helpers/formatCurrency";

/** Revenue can be split across currencies (Razorpay/BillDesk in INR, PayPal
 * in USD) — shown as-is rather than force-converting into one number,
 * since there's no live FX rate to convert with. */
function formatRevenue(rowsByCurrency) {
  if (!rowsByCurrency?.length) return formatMoney(0, "INR");
  return rowsByCurrency.map((r) => formatMoney(r.total, r.currency)).join(" + ");
}

const ICONS = {
  building: Building2, check: CheckCircle2, clock: Clock, x: XCircle,
  dollar: DollarSign, trending: TrendingUp, users: Users, userCog: UserCog,
  contact: Contact2, storage: HardDrive, package: Package, sparkles: Sparkles,
  alert: AlertTriangle, shield: ShieldCheck, shieldAlert: ShieldAlert,
};

const ACCENTS = {
  indigo: "text-indigo-400 bg-indigo-500/10",
  green: "text-emerald-400 bg-emerald-500/10",
  yellow: "text-amber-400 bg-amber-500/10",
  red: "text-red-400 bg-red-500/10",
  blue: "text-sky-400 bg-sky-500/10",
  purple: "text-violet-400 bg-violet-500/10",
  neutral: "text-muted-foreground bg-muted-foreground/10",
};

function Kpi({ label, value, icon, accent = "indigo", hint, href }) {
  const Icon = ICONS[icon];
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs mb-1 truncate">{label}</p>
        <p className="text-foreground text-xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-muted-foreground text-[11px] mt-0.5">{hint}</p>}
      </div>
      {Icon && (
        <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${ACCENTS[accent]}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      )}
    </>
  );
  const className = "bg-card border border-border rounded-xl p-4 flex items-center justify-between transition-all";
  return href ? (
    <Link href={href} className={`${className} cursor-pointer hover:border-border hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}>{content}</Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export default function KpiGrid({ kpis }) {
  const cards = [
    { label: "Total Companies", value: kpis.totalCompanies, icon: "building", accent: "indigo", href: "/platform/companies" },
    { label: "Active Companies", value: kpis.activeCompanies, icon: "check", accent: "green", href: "/platform/companies" },
    { label: "Trial Companies", value: kpis.trialCompanies, icon: "clock", accent: "yellow", href: "/platform/companies" },
    { label: "Expired Companies", value: kpis.expiredCompanies, icon: "x", accent: "red", href: "/platform/companies" },
    { label: "Total Revenue", value: formatRevenue(kpis.totalRevenueByCurrency), icon: "dollar", accent: "green", hint: "all-time, completed payments" },
    { label: "Revenue (Selected Range)", value: formatRevenue(kpis.periodRevenueByCurrency), icon: "trending", accent: "indigo", hint: "in selected range" },
    { label: "Active Users", value: kpis.activeUsers, icon: "users", accent: "blue" },
    { label: "Total Employees", value: kpis.totalEmployees, icon: "userCog", accent: "blue" },
    { label: "CRM Usage", value: `${kpis.crmUsage} companies`, icon: "contact", accent: "purple", href: "/platform/modules" },
    { label: "Storage Usage", value: `${kpis.storageUsageMb} MB`, icon: "storage", accent: "yellow" },
    { label: "Module Usage", value: `${kpis.moduleUsageTotal} enabled`, icon: "package", accent: "indigo", href: "/platform/modules" },
    { label: "New Companies", value: kpis.newCompanies, icon: "sparkles", accent: "green", hint: "in selected range", href: "/platform/companies" },
    { label: "Pending Provisioning", value: kpis.pendingProvisioning, icon: "alert", accent: kpis.pendingProvisioning > 0 ? "red" : "neutral", hint: "failed provisioning steps", href: "/platform/activity-logs" },
    { label: "Active Licenses", value: kpis.activeLicenses, icon: "shield", accent: "green", href: "/platform/companies" },
    { label: "Expiring Licenses", value: kpis.expiringLicenses, icon: "shieldAlert", accent: kpis.expiringLicenses > 0 ? "yellow" : "neutral", hint: "within 30 days", href: "/platform/companies" },
    { label: "Failed Payments", value: kpis.failedPayments, icon: "alert", accent: kpis.failedPayments > 0 ? "red" : "neutral" },
    { label: "Past Due Subscriptions", value: kpis.pastDueSubscriptions, icon: "shieldAlert", accent: kpis.pastDueSubscriptions > 0 ? "red" : "neutral", href: "/platform/subscriptions" },
    { label: "Open Support Tickets", value: kpis.openSupportTickets, icon: "alert", accent: kpis.openSupportTickets > 0 ? "yellow" : "neutral", href: "/platform/support" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => <Kpi key={c.label} {...c} />)}
    </div>
  );
}
