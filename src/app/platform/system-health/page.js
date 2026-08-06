import { getSystemHealth } from "@/lib/platform/actions/systemHealth";
import { Database, Rocket, Mail, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const STATUS_META = {
  healthy: { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  warning: { icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  critical: { icon: XCircle, color: "text-red-400 bg-red-500/10 border-red-500/30" },
};

function CheckCard({ icon: Icon, title, status, children }) {
  const meta = STATUS_META[status] || STATUS_META.healthy;
  const StatusIcon = meta.icon;
  return (
    <div className={`bg-neutral-900 border rounded-xl p-5 ${meta.color.split(" ").find((c) => c.startsWith("border"))}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-neutral-300"><Icon className="h-4 w-4" /><p className="font-medium text-white">{title}</p></div>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border capitalize ${meta.color}`}><StatusIcon className="h-3 w-3" />{status}</span>
      </div>
      {children}
    </div>
  );
}

export default async function SystemHealthPage() {
  const { checks, details } = await getSystemHealth();
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">System Health</h1>
      <p className="text-neutral-500 text-sm mb-6">Last checked {new Date(details.timestamp).toLocaleString()}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <CheckCard icon={Database} title="Database" status={checks.database.status}>
          <p className="text-neutral-500 text-sm">{checks.database.latencyMs != null ? `Responding in ${checks.database.latencyMs}ms` : "Connection failed"}</p>
        </CheckCard>
        <CheckCard icon={Rocket} title="Provisioning" status={checks.provisioning.status}>
          <p className="text-neutral-500 text-sm">{checks.provisioning.failedLast7Days} failed step{checks.provisioning.failedLast7Days === 1 ? "" : "s"} in last 7 days</p>
        </CheckCard>
        <CheckCard icon={Mail} title="Email Delivery" status={checks.email.status}>
          <p className="text-neutral-500 text-sm">{checks.email.failedLast7Days} failed send{checks.email.failedLast7Days === 1 ? "" : "s"} in last 7 days</p>
        </CheckCard>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"><p className="text-neutral-500 text-xs mb-1">Active Companies</p><p className="text-white text-2xl font-semibold">{details.activeCompanies}</p></div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"><p className="text-neutral-500 text-xs mb-1">Locked Accounts</p><p className="text-white text-2xl font-semibold">{details.lockedAccounts}</p></div>
      </div>
    </div>
  );
}
