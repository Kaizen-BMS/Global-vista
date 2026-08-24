"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Ban, RotateCcw, ArrowUpRight, Receipt, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { formatDate } from "@/lib/helpers/dateFormat";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";
import { loadRazorpayScript } from "@/lib/helpers/loadRazorpayScript";

const GATEWAY_LABEL = { billdesk: "BillDesk", razorpay: "Razorpay" };

const STATUS_META = {
  completed: { label: "Paid", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  pending: { label: "Pending", color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  processing: { label: "Processing", color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  failed: { label: "Failed", color: "text-red-400 border-red-500/30 bg-red-500/10" },
  cancelled: { label: "Cancelled", color: "text-muted-foreground border-border bg-muted/30" },
  refunded: { label: "Refunded", color: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
  reversed: { label: "Reversed", color: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
  expired: { label: "Expired", color: "text-muted-foreground border-border bg-muted/30" },
};

function PlanPickerModal({ plans, currentPlanId, subscriptionState, onClose }) {
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState(null); // plan id currently starting checkout
  const [couponCode, setCouponCode] = useState("");
  const [gateway, setGateway] = useState(""); // only relevant when a plan offers both

  // "Current plan" only locks the Subscribe button when it's actually
  // active — a plan stuck in pending/payment_failed/past_due means checkout
  // was started but never completed, and retrying on that exact plan is
  // exactly what the owner needs to be able to do here.
  const needsPayment = ["pending", "payment_failed", "past_due"].includes(subscriptionState);
  const anyGatewayAvailable = plans.some((p) => p.hasBillDesk || p.hasRazorpay);
  const anyPlanOffersChoice = plans.some((p) => p.hasBillDesk && p.hasRazorpay);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function payWithRazorpayThenFinish(data) {
    try {
      await loadRazorpayScript();
      const rzp = new window.Razorpay({
        key: data.razorpayKeyId,
        subscription_id: data.razorpaySubscriptionId,
        name: "KaizenBMS Platform",
        description: `${data.planName} subscription`,
        theme: { color: "#4f46e5" },
        handler: async (response) => {
          try {
            const verifyRes = await apiFetch("/api/core/subscription/razorpay/verify", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpaySubscriptionId: response.razorpay_subscription_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed. Please contact support.");
            toast.success("Subscription activated.");
            onClose();
            router.refresh();
          } catch (err) { toast.error(err.message); }
          finally { setCheckingOut(null); }
        },
        modal: { ondismiss: () => setCheckingOut(null) },
      });
      rzp.on("payment.failed", () => { toast.error("Payment could not be completed. Please try again."); setCheckingOut(null); });
      rzp.open();
    } catch (err) { toast.error(err.message); setCheckingOut(null); }
  }

  async function choosePlan(plan) {
    if (!(Number(plan.price) > 0)) {
      toast.error("Switching to a free/trial plan requires the platform team — contact support to change to this plan.");
      return;
    }
    if (!plan.hasBillDesk && !plan.hasRazorpay) {
      toast.error("Payment isn't configured for this plan yet. Please contact the platform team.");
      return;
    }
    const effectiveGateway = plan.hasBillDesk && plan.hasRazorpay ? gateway : plan.hasBillDesk ? "billdesk" : "razorpay";
    if (!effectiveGateway) {
      toast.error("Choose a payment method.");
      return;
    }

    setCheckingOut(plan.id);
    if (effectiveGateway === "billdesk") {
      try {
        const res = await apiFetch("/api/core/subscription/billdesk/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id, couponCode: couponCode.trim() || null }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't start checkout.");
        window.location.href = data.checkoutUrl;
      } catch (err) { toast.error(err.message); setCheckingOut(null); }
      return;
    }

    // Razorpay Checkout is an in-page modal, not a redirect.
    try {
      const res = await apiFetch("/api/core/subscription/razorpay/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id, couponCode: couponCode.trim() || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start checkout.");
      await payWithRazorpayThenFinish(data);
    } catch (err) { toast.error(err.message); setCheckingOut(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <ModalFocusTrap>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} role="dialog" aria-modal="true" aria-label="Choose a Plan" className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <p className="text-foreground font-semibold">Choose a Plan</p>
            <p className="text-muted-foreground text-[11px] mt-0.5">Secure payment powered by BillDesk or Razorpay</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        {!anyGatewayAvailable && (
          <div className="mx-6 mt-4 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Payment isn't configured on this platform yet — paid plans can't be checked out until the platform team connects a payment gateway.
          </div>
        )}

        <div className="px-6 pt-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-muted-foreground text-xs mb-1.5">Coupon Code (optional)</label>
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="e.g. SAVE20" className="w-full sm:w-64 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
          </div>
          {anyPlanOffersChoice && (
            <div>
              <label className="block text-muted-foreground text-xs mb-1.5">Payment Method</label>
              <div className="flex gap-2">
                {["billdesk", "razorpay"].map((gw) => (
                  <button
                    key={gw} type="button" onClick={() => setGateway(gw)}
                    className={`px-3 py-2 rounded-lg border text-sm cursor-pointer transition ${gateway === gw ? "border-indigo-500 bg-indigo-500/10 text-foreground" : "border-border bg-muted text-muted-foreground hover:border-indigo-500/30"}`}
                  >
                    {GATEWAY_LABEL[gw]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const isSamePlan = plan.id === currentPlanId;
            const isCurrent = isSamePlan && !needsPayment;
            const isPaid = Number(plan.price) > 0;
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-xl border p-4 flex flex-col transition ${isCurrent ? "border-indigo-500/40 bg-indigo-500/5" : "border-border bg-muted/30 hover:border-indigo-500/20"}`}>
                {isCurrent && <span className="absolute -top-2.5 left-4 text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-medium">Current Plan</span>}
                <p className="text-foreground font-medium mt-1">{plan.name}</p>
                {plan.description && <p className="text-muted-foreground text-xs mt-1">{plan.description}</p>}
                <p className="text-foreground text-lg font-semibold mt-2">
                  {isPaid ? `${plan.currency} ${Number(plan.price).toLocaleString()}` : "Free"}
                  {isPaid && <span className="text-muted-foreground text-xs font-normal"> / {plan.billing_cycle}</span>}
                </p>
                {!!plan.trial_days && <p className="text-indigo-400 text-[11px] mt-1">{plan.trial_days}-day free trial</p>}
                <ul className="text-muted-foreground text-xs mt-2 space-y-1 flex-1">
                  {plan.max_users ? <li>{plan.max_users} employees</li> : <li>Unlimited employees</li>}
                  {plan.max_leads ? <li>{plan.max_leads.toLocaleString()} leads</li> : <li>Unlimited leads</li>}
                  {plan.max_storage_mb ? <li>{Math.round(plan.max_storage_mb / 1024)}GB storage</li> : <li>Unlimited storage</li>}
                </ul>
                <button
                  onClick={() => choosePlan(plan)}
                  disabled={isCurrent || checkingOut === plan.id || (isPaid && !plan.hasBillDesk && !plan.hasRazorpay)}
                  className="btn-brand mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  {checkingOut === plan.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCurrent && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {isCurrent ? "Current Plan" : isSamePlan && needsPayment ? "Complete Payment" : isPaid ? "Subscribe" : "Contact Support"}
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
      </ModalFocusTrap>
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
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center gap-1.5 mb-3 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> Secure payment powered by BillDesk or Razorpay
      </div>
      <div className="flex flex-wrap gap-2">
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
      </div>

      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="w-full overflow-hidden">
            <div className="mt-3 bg-muted/30 border border-border rounded-lg overflow-x-auto">
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-xs p-3">No payments recorded yet.</p>
              ) : (
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Plan</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Gateway</th>
                      <th className="px-3 py-2 font-medium">Transaction ID</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => {
                      const meta = STATUS_META[p.status] || STATUS_META.pending;
                      return (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(p.created_at, timezone)}</td>
                          <td className="px-3 py-2 text-foreground">{p.plan_name}</td>
                          <td className="px-3 py-2 text-foreground whitespace-nowrap">{p.currency} {Number(p.amount).toLocaleString()}</td>
                          <td className="px-3 py-2 text-muted-foreground capitalize">{p.gateway}</td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]">{p.gateway_transaction_id || "—"}</td>
                          <td className="px-3 py-2"><span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] ${meta.color}`}>{meta.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPicker && <PlanPickerModal plans={plans} currentPlanId={subscription.planId} subscriptionState={subscription.state} onClose={() => setShowPicker(false)} />}
    </div>
  );
}
