"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, CreditCard, Ban, RotateCcw, ArrowUpRight, Receipt } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { formatDate } from "@/lib/helpers/dateFormat";
import { useTimezone } from "@/components/shared/TimezoneProvider";

function PlanPickerModal({ plans, currentPlanId, onClose }) {
  const [busyId, setBusyId] = useState(null);

  async function choosePlan(plan) {
    if (Number(plan.price) > 0) {
      setBusyId(plan.id);
      try {
        const res = await apiFetch("/api/core/subscription/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't start checkout.");
        window.location.href = data.approveUrl;
      } catch (err) { toast.error(err.message); setBusyId(null); }
    } else {
      toast.error("Switching to a free/trial plan requires the platform team — contact support to change to this plan.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <p className="text-foreground font-semibold">Choose a Plan</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isPaid = Number(plan.price) > 0;
            return (
              <div key={plan.id} className={`rounded-xl border p-4 flex flex-col ${isCurrent ? "border-indigo-500/40 bg-indigo-500/5" : "border-border bg-muted/30"}`}>
                <p className="text-foreground font-medium">{plan.name}</p>
                {plan.description && <p className="text-muted-foreground text-xs mt-1">{plan.description}</p>}
                <p className="text-foreground text-lg font-semibold mt-2">
                  {isPaid ? `${plan.currency} ${Number(plan.price).toLocaleString()}` : "Free"}
                  {isPaid && <span className="text-muted-foreground text-xs font-normal"> / {plan.billing_cycle}</span>}
                </p>
                <ul className="text-muted-foreground text-xs mt-2 space-y-1 flex-1">
                  {plan.max_users && <li>{plan.max_users} employees</li>}
                  {plan.max_leads && <li>{plan.max_leads.toLocaleString()} leads</li>}
                  {plan.max_storage_mb && <li>{Math.round(plan.max_storage_mb / 1024)}GB storage</li>}
                </ul>
                <button
                  onClick={() => choosePlan(plan)}
                  disabled={isCurrent || busyId === plan.id}
                  className="btn-brand mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  {busyId === plan.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCurrent ? "Current Plan" : isPaid ? "Subscribe with PayPal" : "Contact Support"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionManager({ subscription, plans, payments: initialPayments, canResume }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [showPicker, setShowPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [payments] = useState(initialPayments);
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (!confirm("Cancel your subscription? You'll keep access until the current billing period ends, then the plan will stop renewing.")) return;
    setBusy(true);
    try {
      const res = await apiFetch("/api/core/subscription/cancel", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to cancel.");
      toast.success("Subscription cancelled.");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function resume() {
    setBusy(true);
    try {
      const res = await apiFetch("/api/core/subscription/resume", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to resume.");
      toast.success("Subscription resumed.");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
      <button onClick={() => setShowPicker(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition">
        <ArrowUpRight className="h-3.5 w-3.5" /> Upgrade / Change Plan
      </button>
      {canResume && (
        <button onClick={resume} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground text-xs font-medium cursor-pointer disabled:opacity-50 transition">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Resume Subscription
        </button>
      )}
      {subscription.hasSubscription && subscription.state !== "cancelled" && (
        <button onClick={cancel} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-red-400 text-xs font-medium cursor-pointer disabled:opacity-50 transition">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Cancel Subscription
        </button>
      )}
      <button onClick={() => setShowHistory((s) => !s)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground text-xs font-medium cursor-pointer transition">
        <Receipt className="h-3.5 w-3.5" /> Payment History
      </button>

      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="w-full overflow-hidden">
            <div className="mt-3 bg-muted/30 border border-border rounded-lg divide-y divide-border">
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-xs p-3">No payments recorded yet.</p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="text-foreground">{p.plan_name} — {p.currency} {Number(p.amount).toLocaleString()}</p>
                      <p className="text-muted-foreground truncate">{formatDate(p.created_at, timezone)} · {p.paypal_transaction_id || "—"}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] ${p.status === "completed" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>{p.status}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPicker && <PlanPickerModal plans={plans} currentPlanId={subscription.planId} onClose={() => setShowPicker(false)} />}
    </div>
  );
}
