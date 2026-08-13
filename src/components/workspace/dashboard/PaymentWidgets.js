import Link from "next/link";
import { Wallet, TrendingUp, Clock3, AlertTriangle, PiggyBank, CheckCircle2, CircleDollarSign } from "lucide-react";
import { formatMoney } from "@/lib/helpers/formatCurrency";
import { formatDate } from "@/lib/helpers/dateFormat";

function Kpi({ label, value, icon: Icon, accent = "indigo" }) {
  const accents = {
    indigo: "text-indigo-400 bg-indigo-500/10", green: "text-emerald-400 bg-emerald-500/10",
    yellow: "text-amber-400 bg-amber-500/10", red: "text-red-400 bg-red-500/10", blue: "text-sky-400 bg-sky-500/10",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs mb-1 truncate">{label}</p>
        <p className="text-foreground text-lg font-semibold tabular-nums truncate">{value}</p>
      </div>
      <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${accents[accent]}`}><Icon className="h-4.5 w-4.5" /></div>
    </div>
  );
}

export function EmployeePaymentKpiGrid({ data, currency }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Kpi label="Today's Collections" value={formatMoney(data.todayCollections, currency)} icon={Wallet} accent="green" />
      <Kpi label="This Month" value={formatMoney(data.monthCollections, currency)} icon={TrendingUp} accent="indigo" />
      <Kpi label="Pending" value={formatMoney(data.pendingAmount, currency)} icon={Clock3} accent="yellow" />
      <Kpi label="Overdue" value={formatMoney(data.overdueAmount, currency)} icon={AlertTriangle} accent={data.overdueAmount > 0 ? "red" : "indigo"} />
    </div>
  );
}

export function SuperAdminPaymentKpiGrid({ data, currency }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Kpi label="Total Revenue" value={formatMoney(data.totalRevenue, currency)} icon={CircleDollarSign} accent="green" />
      <Kpi label="Today" value={formatMoney(data.todayCollections, currency)} icon={Wallet} accent="green" />
      <Kpi label="This Month" value={formatMoney(data.monthCollections, currency)} icon={TrendingUp} accent="indigo" />
      <Kpi label="Outstanding" value={formatMoney(data.outstanding, currency)} icon={PiggyBank} accent="yellow" />
      <Kpi label="Overdue" value={formatMoney(data.overdue, currency)} icon={AlertTriangle} accent={data.overdue > 0 ? "red" : "indigo"} />
      <Kpi label="Paid Plans" value={`${data.paidPlans} paid · ${data.partiallyPaidPlans} partial`} icon={CheckCircle2} accent="blue" />
    </div>
  );
}

export function RecentPaymentsTable({ payments, timezone }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-foreground font-medium mb-3">Recent Payments</p>
      {payments.length === 0 ? (
        <p className="text-muted-foreground text-sm">No payments recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Link key={p.id} href={`/workspace/lead-management/${p.lead_id}`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-muted transition cursor-pointer">
              <div className="min-w-0">
                <p className="text-foreground text-sm truncate">{p.lead_name}</p>
                <p className="text-muted-foreground text-xs">{p.payment_method} · {formatDate(p.payment_date, timezone)}</p>
              </div>
              <p className="text-foreground text-sm font-medium shrink-0">{formatMoney(p.amount, p.currency)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionsBreakdown({ title, rows, labelKey, currency }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.total)));
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-foreground font-medium mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={`${r[labelKey] || "unknown"}-${i}`}>
              <div className="flex justify-between text-xs mb-1"><span className="text-foreground">{r[labelKey] || "Unassigned"}</span><span className="text-muted-foreground">{formatMoney(r.total, currency)}</span></div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(Number(r.total) / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
