"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Ban, RotateCcw, ArrowUpRight, Receipt, ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { formatDate } from "@/lib/helpers/dateFormat";
import { useTimezone } from "@/components/shared/TimezoneProvider";

const GATEWAY_LABEL = { razorpay: "Razorpay", paypal: "PayPal" };

/** Loads Razorpay's official Checkout overlay script once, on demand — not
 * on every page load, since most companies never open this modal. */
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load Razorpay Checkout. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

function GatewayStep({ plan, gateways, onBack, onClose }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null); // "razorpay" | "paypal" | null

  async function payWithPayPal() {
    setBusy("paypal");
    try {
      const res = await apiFetch("/api/core/subscription/paypal/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start PayPal checkout.");
      window.location.href = data.approveUrl;
    } catch (err) { toast.error(err.message); setBusy(null); }
  }

  async function payWithRazorpay() {
    setBusy("razorpay");
    try {
      await loadRazorpayScript();
      const res = await apiFetch("/api/core/subscription/razorpay/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start Razorpay checkout.");

      const rzp = new window.Razorpay({
        key: data.razorpayKeyId,
        subscription_id: data.razorpaySubscriptionId,
        name: "KaizenBMS Platform",
        description: `${data.planName} subscription`,
        theme: { color: "#4f46e5" },
        handler: async (response) => {
          // Razorpay Checkout reporting success is NOT proof of payment —
          // the server re-derives the HMAC signature and re-fetches the
          // subscription from Razorpay before ever marking it active.
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
            toast.success(verifyData.status === "active" ? "Subscription activated!" : "Payment received — subscription is being confirmed.");
            onClose();
            router.refresh();
          } catch (err) { toast.error(err.message); }
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.on("payment.failed", () => { toast.error("Payment could not be completed. Please try again."); setBusy(null); });
      rzp.open();
    } catch (err) { toast.error(err.message); setBusy(null); }
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs cursor-pointer mb-4"><ArrowLeft className="h-3.5 w-3.5" /> Back to plans</button>
      <p className="text-foreground font-semibold mb-1">Choose Payment Method</p>
      <p className="text-muted-foreground text-xs mb-4">{plan.name} — {plan.currency} {Number(plan.price).toLocaleString()} / {plan.billing_cycle}</p>

      <div className="space-y-3">
        <GatewayCard
          name="Razorpay" subtitle="UPI / Cards / Net Banking" available={gateways.razorpay?.configured}
          busy={busy === "razorpay"} disabled={!!busy} onClick={payWithRazorpay}
        />
        <GatewayCard
          name="PayPal" subtitle="International payments" available={gateways.paypal?.configured}
          busy={busy === "paypal"} disabled={!!busy} onClick={payWithPayPal}
        />
      </div>
    </div>
  );
}

function GatewayCard({ name, subtitle, available, busy, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!available || disabled}
      className={`w-full flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${available ? "border-border bg-muted/30 hover:border-indigo-500/40 hover:bg-indigo-500/5 cursor-pointer" : "border-border/50 bg-muted/10 cursor-not-allowed opacity-60"}`}
    >
      <div>
        <p className="text-foreground text-sm font-medium">{name}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{available ? subtitle : "Not currently available"}</p>
      </div>
      <span className="shrink-0">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        ) : (
          <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${available ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-muted-foreground border-border bg-muted/30"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-emerald-400" : "bg-muted-foreground"}`} /> {available ? "Available" : "Unavailable"}
          </span>
        )}
      </span>
    </button>
  );
}

function PlanPickerModal({ plans, currentPlanId, subscriptionState, gateways, onClose }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const anyGatewayAvailable = !!(gateways.razorpay?.configured || gateways.paypal?.configured);
  // "Current plan" only locks the Subscribe button when it's actually active
  // — a plan stuck in pending/payment_failed/past_due means the checkout
  // was started but never completed, and retrying on that exact same plan
  // is exactly what the owner needs to be able to do here.
  const needsPayment = ["pending", "payment_failed", "past_due"].includes(subscriptionState);

  function choosePlan(plan) {
    if (Number(plan.price) > 0) {
      if (!anyGatewayAvailable) { toast.error("No payment gateway is currently configured. Please contact the platform team."); return; }
      setSelectedPlan(plan);
    } else {
      toast.error("Switching to a free/trial plan requires the platform team — contact support to change to this plan.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <p className="text-foreground font-semibold">{selectedPlan ? "Checkout" : "Choose a Plan"}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <AnimatePresence mode="wait">
          {selectedPlan ? (
            <motion.div key="gateway" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              <GatewayStep plan={selectedPlan} gateways={gateways} onBack={() => setSelectedPlan(null)} onClose={onClose} />
            </motion.div>
          ) : (
            <motion.div key="plans" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const isSamePlan = plan.id === currentPlanId;
                const isCurrent = isSamePlan && !needsPayment;
                const isPaid = Number(plan.price) > 0;
                return (
                  <div key={plan.id} className={`rounded-xl border p-4 flex flex-col transition ${isCurrent ? "border-indigo-500/40 bg-indigo-500/5" : "border-border bg-muted/30"}`}>
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
                      disabled={isCurrent}
                      className="btn-brand mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {isCurrent && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {isCurrent ? "Current Plan" : isSamePlan && needsPayment ? "Complete Payment" : isPaid ? "Subscribe" : "Contact Support"}
                    </button>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function SubscriptionManager({ subscription, plans, payments: initialPayments, canResume, gateways = {} }) {
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
                      <p className="text-foreground">{p.plan_name} — {p.currency} {Number(p.amount).toLocaleString()} <span className="text-muted-foreground">via {GATEWAY_LABEL[p.gateway] || p.gateway}</span></p>
                      <p className="text-muted-foreground truncate">{formatDate(p.created_at, timezone)} · {p.gateway_transaction_id || "—"}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] ${p.status === "completed" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>{p.status}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPicker && <PlanPickerModal plans={plans} currentPlanId={subscription.planId} subscriptionState={subscription.state} gateways={gateways} onClose={() => setShowPicker(false)} />}
    </div>
  );
}
