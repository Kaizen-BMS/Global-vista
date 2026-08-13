"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, CheckCircle2, AlertTriangle, XCircle, Ban, Clock, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { formatDate } from "@/lib/helpers/dateFormat";
import { formatBytes } from "@/lib/helpers/formatBytes";
import FloatingPanel from "@/components/shared/FloatingPanel";

const STATE_META = {
  active: { label: "Active", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  trial: { label: "Trial", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30", icon: Clock },
  expiring_soon: { label: "Expiring Soon", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  expired: { label: "Expired", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
  suspended: { label: "Suspended", color: "text-orange-400 bg-orange-500/10 border-orange-500/30", icon: Ban },
  deleted: { label: "Deleted", color: "text-muted-foreground bg-muted/20 border-border/30", icon: XCircle },
  no_subscription: { label: "No Subscription", color: "text-muted-foreground bg-muted/20 border-border/30", icon: AlertTriangle },
};

function StatusBadge({ state }) {
  const meta = STATE_META[state] || STATE_META.no_subscription;
  const Icon = meta.icon;
  return <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${meta.color}`}><Icon className="h-3 w-3" />{meta.label}</span>;
}

function RowActions({ row, plans, onChanged }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // "extend" | "renew" | "change-plan"
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(30);
  const [newDate, setNewDate] = useState("");
  const [newPlanId, setNewPlanId] = useState(row.plan_id || "");

  async function call(url, body, successMsg) {
    setBusy(true);
    try {
      const res = await apiFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed.");
      toast.success(successMsg);
      if (data.storageExceeded) toast.warning("Storage exceeds the new plan limit — new uploads will be blocked until it's brought below the limit or the plan is upgraded further.");
      setMode(null); setOpen(false);
      onChanged();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function suspend() {
    if (!confirm(`Suspend ${row.company_name}? Their workspace will become inaccessible until reactivated.`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/companies/${row.company_id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "suspended" }) });
      if (!res.ok) throw new Error();
      toast.success("Company suspended.");
      setOpen(false); onChanged();
    } catch { toast.error("Failed to suspend."); } finally { setBusy(false); }
  }

  async function reactivate() {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/companies/${row.company_id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) });
      if (!res.ok) throw new Error();
      toast.success("Company reactivated.");
      setOpen(false); onChanged();
    } catch { toast.error("Failed to reactivate."); } finally { setBusy(false); }
  }

  async function cancel() {
    if (!confirm(`Cancel ${row.company_name}'s subscription?`)) return;
    call("/api/platform/subscriptions/cancel", { companyId: row.company_id }, "Subscription cancelled.");
  }

  return (
    <div className="relative inline-block">
      <button ref={anchorRef} onClick={() => { setOpen((o) => !o); setMode(null); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition">
        <MoreVertical className="h-4 w-4" />
      </button>
      <FloatingPanel anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} width={260} className="p-3">
        {mode === null && (
          <div className="space-y-1">
            <Link href={`/platform/companies/${row.company_id}`} className="block px-2 py-1.5 rounded-md text-sm text-popover-foreground hover:bg-accent cursor-pointer">View Company</Link>
            <button onClick={() => setMode("extend")} className="w-full text-left px-2 py-1.5 rounded-md text-sm text-popover-foreground hover:bg-accent cursor-pointer">Extend Subscription</button>
            <button onClick={() => setMode("renew")} className="w-full text-left px-2 py-1.5 rounded-md text-sm text-popover-foreground hover:bg-accent cursor-pointer">Renew (set expiry)</button>
            <button onClick={() => setMode("change-plan")} className="w-full text-left px-2 py-1.5 rounded-md text-sm text-popover-foreground hover:bg-accent cursor-pointer">Change Plan</button>
            {row.company_status === "suspended"
              ? <button onClick={reactivate} disabled={busy} className="w-full text-left px-2 py-1.5 rounded-md text-sm text-emerald-400 hover:bg-emerald-500/10 cursor-pointer">Reactivate</button>
              : <button onClick={suspend} disabled={busy} className="w-full text-left px-2 py-1.5 rounded-md text-sm text-orange-400 hover:bg-orange-500/10 cursor-pointer">Suspend</button>}
            <button onClick={cancel} disabled={busy} className="w-full text-left px-2 py-1.5 rounded-md text-sm text-red-400 hover:bg-red-500/10 cursor-pointer">Cancel Subscription</button>
          </div>
        )}
        {mode === "extend" && (
          <div className="space-y-2">
            <p className="text-popover-foreground text-xs font-medium">Extend by how many days?</p>
            <div className="flex items-center gap-2">
              <input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm" />
              <button onClick={() => call("/api/platform/subscriptions/extend", { companyId: row.company_id, days: Number(days) }, `Extended by ${days} days.`)} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50">
                {busy && <Loader2 className="h-3 w-3 animate-spin" />} Extend
              </button>
            </div>
            <button onClick={() => setMode(null)} className="text-muted-foreground hover:text-foreground text-xs cursor-pointer">Back</button>
          </div>
        )}
        {mode === "renew" && (
          <div className="space-y-2">
            <p className="text-popover-foreground text-xs font-medium">New expiry date</p>
            <div className="flex items-center gap-2">
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm" />
              <button onClick={() => newDate && call("/api/platform/subscriptions/renew", { companyId: row.company_id, endsAt: newDate }, "Subscription renewed.")} disabled={busy || !newDate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50">
                {busy && <Loader2 className="h-3 w-3 animate-spin" />} Renew
              </button>
            </div>
            <button onClick={() => setMode(null)} className="text-muted-foreground hover:text-foreground text-xs cursor-pointer">Back</button>
          </div>
        )}
        {mode === "change-plan" && (
          <div className="space-y-2">
            <p className="text-popover-foreground text-xs font-medium">New plan</p>
            <select value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={() => call("/api/platform/subscriptions/change-plan", { companyId: row.company_id, planId: Number(newPlanId) }, "Plan changed.")} disabled={busy} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50">
              {busy && <Loader2 className="h-3 w-3 animate-spin" />} Change Plan
            </button>
            <button onClick={() => setMode(null)} className="text-muted-foreground hover:text-foreground text-xs cursor-pointer">Back</button>
          </div>
        )}
      </FloatingPanel>
    </div>
  );
}

export default function SubscriptionsTable({ subscriptions, plans, timezone }) {
  const router = useRouter();
  const onChanged = () => router.refresh();

  if (subscriptions.length === 0) return <p className="text-muted-foreground text-sm">No companies yet.</p>;

  return (
    <div className="bg-card border border-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Expiry</th>
            <th className="px-4 py-3 font-medium">Storage</th>
            <th className="px-4 py-3 font-medium">Users</th>
            <th className="px-4 py-3 font-medium">Leads</th>
            <th className="px-4 py-3 font-medium w-10"></th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((row) => (
            <tr key={row.company_id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3"><Link href={`/platform/companies/${row.company_id}`} className="text-foreground hover:text-indigo-400 font-medium">{row.company_name}</Link></td>
              <td className="px-4 py-3 text-foreground/90">{row.plan_name || "—"}</td>
              <td className="px-4 py-3"><StatusBadge state={row.state} /></td>
              <td className="px-4 py-3 text-foreground/90">
                {row.ends_at ? formatDate(row.ends_at, timezone) : "No expiry"}
                {row.daysRemaining != null && row.daysRemaining >= 0 && row.daysRemaining <= 30 && <span className="block text-amber-400 text-[10px]">{row.daysRemaining}d left</span>}
              </td>
              <td className="px-4 py-3 text-foreground/90">{formatBytes(row.storage_bytes)}{row.max_storage_mb ? ` / ${formatBytes(row.max_storage_mb * 1024 * 1024)}` : ""}</td>
              <td className="px-4 py-3 text-foreground/90">{row.user_count}{row.max_users ? ` / ${row.max_users}` : ""}</td>
              <td className="px-4 py-3 text-foreground/90">{row.lead_count}{row.max_leads ? ` / ${row.max_leads}` : ""}</td>
              <td className="px-4 py-3"><RowActions row={row} plans={plans} onChanged={onChanged} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
