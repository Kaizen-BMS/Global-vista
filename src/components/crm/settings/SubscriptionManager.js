"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Ban, RotateCcw, ArrowUpRight, Receipt, CheckCircle2, ShieldCheck, AlertTriangle, Check, Zap, CalendarClock, Shield, Crown, Gem } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { formatDate } from "@/lib/helpers/dateFormat";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";
import { loadRazorpayScript } from "@/lib/helpers/loadRazorpayScript";
import { withGst, GST_LABEL } from "@/lib/helpers/gst";
import { DEFAULT_SEATS } from "@/lib/helpers/seats";
import InvoicePreview from "@/components/billing/InvoicePreview";
import SeatStepper from "@/components/billing/SeatStepper";

const GATEWAY_LABEL = { billdesk: "BillDesk", razorpay: "Razorpay" };

/** Same metal-name-driven theming the public pricing page (PlatformHome.js)
 * already uses for Silver/Gold/Diamond — matched here purely for a
 * cohesive, more premium look on this modal's cards; matched
 * case-insensitively against the plan's own name so it never needs
 * updating if plans are renamed/added. Anything that isn't one of these
 * three (Starter, or a custom plan name) just uses the modal's existing
 * neutral styling — nothing about pricing/checkout logic changes here. */
const PLAN_THEMES = {
  silver: { icon: Shield, text: "text-slate-500 dark:text-slate-300", border: "border-slate-400/40 dark:border-slate-300/30", bar: "bg-slate-400" },
  gold: { icon: Crown, text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/40 dark:border-amber-400/30", bar: "bg-amber-500" },
  diamond: { icon: Gem, text: "text-sky-500 dark:text-sky-300", border: "border-sky-400/40 dark:border-sky-300/30", bar: "bg-sky-500" },
};
function planTheme(name) {
  const key = Object.keys(PLAN_THEMES).find((k) => (name || "").toLowerCase().includes(k));
  return key ? PLAN_THEMES[key] : null;
}

/** Only BillDesk/Razorpay ever get mentioned, and only the ones actually
 * connected to at least one plan shown here — currently just Razorpay, so
 * this reads "Razorpay" rather than a hardcoded "BillDesk or Razorpay" that
 * would name a gateway no plan can actually be checked out through. */
function gatewayTrustLabel(plans) {
  const gateways = [];
  if (plans.some((p) => p.hasBillDesk)) gateways.push("billdesk");
  if (plans.some((p) => p.hasRazorpay)) gateways.push("razorpay");
  if (!gateways.length) return "your payment gateway";
  return gateways.map((g) => GATEWAY_LABEL[g]).join(" or ");
}

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

function PlanPickerModal({ plans, currentPlanId, subscriptionState, currentGateway, currentEndsAt, timezone, onClose, autoCheckout }) {
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState(null); // plan id currently starting checkout, or "planId:now"/"planId:cycle_end" while switching in place
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountType, discountValue }
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [gateway, setGateway] = useState(""); // only relevant when a plan offers both
  const [durationByPlan, setDurationByPlan] = useState({}); // plan.id -> chosen commitment length in months, default 1
  const getDuration = (plan) => durationByPlan[plan.id] || 1;
  const [seatByPlan, setSeatByPlan] = useState({}); // plan.id -> chosen seat count, default DEFAULT_SEATS — only meaningful for pricing_model='per_user'
  const getSeats = (plan) => (plan.pricing_model === "per_user" ? seatByPlan[plan.id] || DEFAULT_SEATS : 1);
  // Only relevant when switching an already-active subscription in place —
  // a real, explained choice picked BEFORE moving to the invoice, rather
  // than two lookalike buttons that each both choose the timing AND fire
  // the change in the same click.
  const [timingByPlan, setTimingByPlan] = useState({}); // plan.id -> "now" | "cycle_end", default "now"
  const getTiming = (plan) => timingByPlan[plan.id] || "now";
  // Pre-filled from whatever's already on file for this company (see
  // /api/core/subscription/gstin's GET) so a returning buyer isn't asked
  // to retype it every time; saved back (best-effort) once checkout/plan
  // change actually succeeds.
  const [gstin, setGstin] = useState("");
  useEffect(() => {
    apiFetch("/api/core/subscription/gstin").then((r) => r.json()).then((d) => setGstin(d.gstin || "")).catch(() => {});
  }, []);
  function saveGstin() {
    if (!gstin) return;
    apiFetch("/api/core/subscription/gstin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gstin }) }).catch(() => {});
  }
  // Set the moment "Subscribe"/"Switch Now"/"At Renewal" is clicked — shows
  // an invoice preview (see InvoicePreview) in place of the plan grid,
  // requiring an explicit "Proceed to Pay" before the real checkout/
  // plan-change actually fires. `when` mirrors changePlanInPlace's own
  // values ("now"/"cycle_end"), or null for a fresh-checkout Subscribe.
  const [pendingInvoice, setPendingInvoice] = useState(null); // { plan, when }

  // A company already on an active Razorpay subscription switches plans in
  // place (changeCompanyRazorpayPlan) instead of starting a whole new
  // checkout — Razorpay updates the SAME authorized subscription, so there's
  // a real choice of timing to offer. Anyone else (trial, BillDesk, no
  // subscription yet, mid-checkout) just gets the existing fresh-checkout
  // flow below — there's no existing gateway subscription to switch in
  // place, so timing doesn't apply.
  const canSwitchInPlace = subscriptionState === "active" && currentGateway === "razorpay";

  // "Current plan" only locks the Subscribe button when it's actually
  // active — a plan stuck in pending/payment_failed/past_due means checkout
  // was started but never completed, and retrying on that exact plan is
  // exactly what the owner needs to be able to do here.
  const needsPayment = ["pending", "payment_failed", "past_due"].includes(subscriptionState);
  const anyGatewayAvailable = plans.some((p) => p.hasBillDesk || p.hasRazorpay);
  const anyPlanOffersChoice = plans.some((p) => p.hasBillDesk && p.hasRazorpay);

  // Arriving here via the public pricing page's CTA (?checkoutPlan=X — see
  // platform-home/page.js and SubscriptionSettingsPage) skips having to
  // find and click the plan again, but still goes through the same invoice
  // preview as clicking it here directly would — "choosing" a plan always
  // shows the breakdown before anything is actually charged. Only
  // auto-fires for a plan billed purely through Razorpay (never ambiguous
  // about which gateway) and never twice, even if this effect re-runs for
  // an unrelated reason.
  const autoFiredRef = useRef(false);
  useEffect(() => {
    if (!autoCheckout || autoFiredRef.current) return;
    const plan = plans.find((p) => p.id === autoCheckout.planId);
    if (!plan || plan.id === currentPlanId || !plan.hasRazorpay || plan.hasBillDesk) return;
    autoFiredRef.current = true;
    setDurationByPlan((d) => ({ ...d, [plan.id]: autoCheckout.months || 1 }));
    setPendingInvoice({ plan, when: canSwitchInPlace ? "now" : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckout, plans, currentPlanId, canSwitchInPlace]);

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
        description: data.seatQuantity > 1 ? `${data.planName} subscription (${data.seatQuantity} users)` : `${data.planName} subscription`,
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

  /** Validates the code against whichever priced plan is on screen, purely
   * to confirm it's real and learn its discount type/value — the actual
   * per-plan discounted price shown below is computed client-side from
   * that (same percent/fixed-capped-at-price formula the server itself
   * uses), so every priced plan's card reflects it, not just one. Coupons
   * only ever discount the 1-month price (see checkout's own rule), so
   * this is deliberately validated against `getDuration(plan) === 1` — the
   * card just shows no discount at other durations rather than a
   * misleading number that wouldn't actually apply at checkout. */
  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    const referencePlan = plans.find((p) => Number(p.price) > 0);
    if (!referencePlan) return;
    setCouponChecking(true);
    setCouponError("");
    try {
      const res = await apiFetch("/api/core/subscription/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, planId: referencePlan.id, seatQuantity: getSeats(referencePlan) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid coupon code.");
      setAppliedCoupon({ code: data.code, discountType: data.discountType, discountValue: data.discountValue });
      toast.success(`Coupon "${data.code}" applied.`);
    } catch (err) { setCouponError(err.message); setAppliedCoupon(null); } finally { setCouponChecking(false); }
  }
  function removeCoupon() { setAppliedCoupon(null); setCouponCode(""); setCouponError(""); }
  // Discounts the whole seat-multiplied total ONCE (never once per seat) —
  // same rule the server applies, see coupons.js/razorpayBilling.js.
  function discountFor(plan) {
    if (!appliedCoupon || getDuration(plan) !== 1 || !(Number(plan.price) > 0)) return 0;
    const price = Number(plan.price) * getSeats(plan);
    const raw = appliedCoupon.discountType === "percent" ? (price * appliedCoupon.discountValue) / 100 : appliedCoupon.discountValue;
    return Math.min(Math.round(raw * 100) / 100, price);
  }

  async function choosePlan(plan, monthsOverride) {
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
        const res = await apiFetch("/api/core/subscription/billdesk/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id, couponCode: couponCode.trim() || null, seatQuantity: getSeats(plan) }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't start checkout.");
        window.location.href = data.checkoutUrl;
      } catch (err) { toast.error(err.message); setCheckingOut(null); }
      return;
    }

    // Razorpay Checkout is an in-page modal, not a redirect.
    try {
      const res = await apiFetch("/api/core/subscription/razorpay/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id, couponCode: couponCode.trim() || null, durationMonths: monthsOverride ?? getDuration(plan), seatQuantity: getSeats(plan) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start checkout.");
      saveGstin();
      await payWithRazorpayThenFinish(data);
    } catch (err) { toast.error(err.message); setCheckingOut(null); }
  }

  /** Updates the existing Razorpay subscription in place — no new
   * checkout, no new authorization, so there's no Razorpay Checkout overlay
   * to open here; the change is applied (or scheduled) purely server-side. */
  async function changePlanInPlace(plan, when) {
    setCheckingOut(`${plan.id}:${when}`);
    try {
      const res = await apiFetch("/api/core/subscription/razorpay/change-plan", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id, when, couponCode: appliedCoupon?.code || null, seatQuantity: getSeats(plan), durationMonths: getDuration(plan) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't change plan.");

      saveGstin();
      toast.success(when === "now" ? `Switched to "${plan.name}".` : `Will switch to "${plan.name}" on ${formatDate(data.effectiveAt, timezone)}.`);
      onClose();
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setCheckingOut(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <ModalFocusTrap>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} role="dialog" aria-modal="true" aria-label="Choose a Plan" className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.07] via-transparent to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0"><ArrowUpRight className="h-4.5 w-4.5" /></span>
            <div>
              <p className="text-foreground font-semibold">Choose a Plan</p>
              <p className="flex items-center gap-1 text-muted-foreground text-[11px] mt-0.5"><ShieldCheck className="h-3 w-3 text-indigo-400" /> Secure payment powered by {gatewayTrustLabel(plans)}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="relative text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        {pendingInvoice ? (
          <InvoiceStep
            pendingInvoice={pendingInvoice}
            getDuration={getDuration}
            getSeats={getSeats}
            discountFor={discountFor}
            appliedCoupon={appliedCoupon}
            gateway={gateway}
            checkingOut={checkingOut}
            gstin={gstin}
            onGstinChange={setGstin}
            onBack={() => setPendingInvoice(null)}
            onProceed={() => {
              const { plan, when } = pendingInvoice;
              setPendingInvoice(null);
              if (when) changePlanInPlace(plan, when);
              else choosePlan(plan);
            }}
          />
        ) : (
        <>
        {!anyGatewayAvailable && (
          <div className="mx-6 mt-4 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Payment isn't configured on this platform yet — paid plans can't be checked out until the platform team connects a payment gateway.
          </div>
        )}

        <div className="mx-6 mt-4 flex flex-wrap gap-4 rounded-xl border border-border bg-muted/30 p-4">
          <div>
            <label className="block text-muted-foreground text-xs mb-1.5">Coupon Code (optional)</label>
            {appliedCoupon ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {appliedCoupon.code} — {appliedCoupon.discountType === "percent" ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue} off`}
                </span>
                <button onClick={removeCoupon} aria-label="Remove coupon" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }} onKeyDown={(e) => e.key === "Enter" && applyCoupon()} placeholder="e.g. SAVE20" className="w-full sm:w-56 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
                <button onClick={applyCoupon} disabled={couponChecking || !couponCode.trim()} className="px-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm font-medium cursor-pointer disabled:opacity-50 hover:border-indigo-500/40 transition shrink-0">
                  {couponChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </button>
              </div>
            )}
            {couponError && <p className="text-red-400 text-xs mt-1">{couponError}</p>}
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

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {plans.map((plan) => {
            const isSamePlan = plan.id === currentPlanId;
            const isCurrent = isSamePlan && !needsPayment;
            const isPaid = Number(plan.price) > 0;
            const seats = getSeats(plan);
            // The card's own top-line price tracks whichever commitment
            // length is currently selected below (getDuration(plan)) — a
            // 36-month tier's own, lower per-month rate, not always the
            // plain 1-month price.
            const duration = getDuration(plan);
            const tierForCard = duration > 1 ? plan.durationTiers?.find((t) => t.durationMonths === duration) : null;
            const unitPrice = tierForCard ? Number(tierForCard.price) : Number(plan.price);
            const discount = discountFor(plan);
            // A fixed discount is against the whole seat-multiplied total
            // (see discountFor's own doc comment) — divided back down to a
            // per-seat rate here purely for this per-unit price display;
            // percent discounts land on the same number either way.
            const discountedPrice = discount > 0 ? Math.round(((unitPrice * seats - discount) / seats) * 100) / 100 : null;
            const canSwitchThisPlan = !isCurrent && isPaid && canSwitchInPlace && plan.hasRazorpay;
            const timing = getTiming(plan);
            const featureLines = [
              `Registration: ${plan.registration_label || "Self"}`,
              `Development: ${plan.development_cost_label || "Free"}`,
              `Installation: ${plan.installation_cost_label || "Free"}`,
              plan.max_users ? `${plan.max_users} employees` : "Unlimited employees",
              plan.max_leads ? `${plan.max_leads.toLocaleString()} leads` : "Unlimited leads",
              plan.max_storage_mb ? `${plan.max_storage_mb >= 1024 ? `${Math.round(plan.max_storage_mb / 1024)}GB` : `${plan.max_storage_mb}MB`} storage` : "Unlimited storage",
              `Import/Export: ${plan.allow_import_export === 0 ? "No" : "Yes"}`,
            ];
            const theme = planTheme(plan.name);
            const TierIcon = theme?.icon;
            return (
              <motion.div
                key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
                className={`relative rounded-2xl border p-4 pt-5 flex flex-col shadow-sm transition-shadow hover:shadow-md overflow-hidden ${
                  isCurrent ? "border-indigo-500/40 bg-indigo-500/5" : theme ? `${theme.border} bg-muted/20` : "border-border bg-muted/30"
                }`}
              >
                {/* A thin top accent bar in the plan's own metal color —
                    purely decorative, gives each tier a distinct identity
                    at a glance without touching any pricing/checkout logic. */}
                {theme && <span className={`absolute top-0 left-0 right-0 h-1 ${theme.bar}`} aria-hidden="true" />}
                {isCurrent && <span className="absolute top-2.5 left-4 text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-medium">Current Plan</span>}

                {/* Header */}
                <div className="flex items-center gap-2">
                  {TierIcon && <TierIcon className={`h-4 w-4 shrink-0 ${theme.text}`} />}
                  <p className={`font-semibold ${theme ? theme.text : "text-foreground"}`}>{plan.name}</p>
                </div>
                {plan.description && <p className="text-muted-foreground text-xs mt-1">{plan.description}</p>}

                {/* Price */}
                <div className="mt-3">
                  {discountedPrice != null && <p className="text-muted-foreground text-xs line-through">{plan.currency} {withGst(unitPrice).toLocaleString()}</p>}
                  <p className="text-foreground text-2xl font-bold tracking-tight">
                    {isPaid ? `${plan.currency} ${withGst(discountedPrice ?? unitPrice).toLocaleString()}` : "Free"}
                    {isPaid && <span className="text-muted-foreground text-xs font-normal"> {plan.pricing_model === "per_user" ? "/user/mo" : ` / ${plan.billing_cycle}`}</span>}
                    {discountedPrice != null && <span className="ml-1.5 text-emerald-400 text-xs font-medium">Coupon applied</span>}
                  </p>
                  {isPaid && <p className="text-muted-foreground text-[11px] mt-0.5">Incl. {GST_LABEL} · base {plan.currency} {(discountedPrice ?? unitPrice).toLocaleString()}</p>}
                  {!!plan.trial_days && <p className="text-indigo-400 text-[11px] mt-1 font-medium">{plan.trial_days}-day free trial included</p>}
                </div>

                {/* What's included */}
                <ul className="mt-3 pt-3 border-t border-border/60 space-y-2 text-xs text-muted-foreground flex-1">
                  {featureLines.map((line) => (
                    <li key={line} className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0"><Check className="h-2.5 w-2.5" /></span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                {/* Users (per-seat plans only) */}
                {isPaid && plan.pricing_model === "per_user" && !isCurrent && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    <SeatStepper value={seats} onChange={(v) => setSeatByPlan((s) => ({ ...s, [plan.id]: v }))} />
                    <p className="flex items-center gap-1 text-muted-foreground text-[11px] mt-1.5 bg-muted/60 rounded-md px-2 py-1 w-fit">
                      <Zap className="h-3 w-3 text-indigo-400 shrink-0" /> Total: {plan.currency} {withGst(Math.max(0, unitPrice * seats - discount)).toLocaleString()}/mo for {seats} seats
                    </p>
                  </div>
                )}

                {/* Billing term */}
                {!isCurrent && plan.hasRazorpay && plan.durationTiers?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    <p className="flex items-center gap-1.5 text-foreground text-xs font-medium mb-1.5"><CalendarClock className="h-3 w-3 text-indigo-400" /> Billing term</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[{ durationMonths: 1, price: plan.price }, ...plan.durationTiers].map((opt) => (
                        <button
                          key={opt.durationMonths} type="button" onClick={() => setDurationByPlan((d) => ({ ...d, [plan.id]: opt.durationMonths }))}
                          className={`min-w-0 px-2 py-1.5 rounded-md border text-center cursor-pointer transition ${getDuration(plan) === opt.durationMonths ? "border-indigo-500 bg-indigo-500/10 text-foreground" : "border-border bg-muted text-muted-foreground hover:border-indigo-500/30"}`}
                        >
                          <span className="block text-[11px] font-medium">{opt.durationMonths === 1 ? "1 month" : `${opt.durationMonths} months`}</span>
                          <span className="block text-[10px] opacity-80 break-words">{plan.currency} {withGst(opt.price)}{plan.pricing_model === "per_user" ? " / user" : ""}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* When should this take effect? — a real, explained choice
                    for a company already on an active plan (a brand-new
                    subscriber has nothing to switch "at renewal" from). */}
                {canSwitchThisPlan && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    <p className="text-foreground text-xs font-medium mb-1.5">When should this take effect?</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        type="button" onClick={() => setTimingByPlan((t) => ({ ...t, [plan.id]: "now" }))}
                        className={`text-left px-2.5 py-2 rounded-lg border transition cursor-pointer ${timing === "now" ? "border-indigo-500 bg-indigo-500/10" : "border-border bg-muted hover:border-indigo-500/30"}`}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground"><Zap className="h-3 w-3 text-indigo-400" /> Right away</span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">Switches immediately — you're billed the new amount today.</span>
                      </button>
                      <button
                        type="button" onClick={() => setTimingByPlan((t) => ({ ...t, [plan.id]: "cycle_end" }))}
                        className={`text-left px-2.5 py-2 rounded-lg border transition cursor-pointer ${timing === "cycle_end" ? "border-indigo-500 bg-indigo-500/10" : "border-border bg-muted hover:border-indigo-500/30"}`}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground"><CalendarClock className="h-3 w-3 text-indigo-400" /> At renewal</span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                          Keep your current plan until {currentEndsAt ? formatDate(currentEndsAt, timezone) : "your next billing date"}, then switch automatically.
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Action */}
                {canSwitchThisPlan ? (
                  <button
                    onClick={() => setPendingInvoice({ plan, when: timing })}
                    disabled={checkingOut === `${plan.id}:now` || checkingOut === `${plan.id}:cycle_end`}
                    className="btn-brand mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
                  >
                    {(checkingOut === `${plan.id}:now` || checkingOut === `${plan.id}:cycle_end`) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Continue{timing === "cycle_end" ? " — At Renewal" : ""}
                  </button>
                ) : (
                <button
                  onClick={() => (isPaid ? setPendingInvoice({ plan, when: null }) : choosePlan(plan))}
                  disabled={isCurrent || checkingOut === plan.id || (isPaid && !plan.hasBillDesk && !plan.hasRazorpay)}
                  className="btn-brand mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  {checkingOut === plan.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCurrent && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {isCurrent ? "Current Plan" : isSamePlan && needsPayment ? "Complete Payment" : isPaid ? "Subscribe" : "Contact Support"}
                </button>
                )}
              </motion.div>
            );
          })}
        </div>
        </>
        )}
      </motion.div>
      </ModalFocusTrap>
    </div>
  );
}

/** The invoice-preview panel shown between choosing a plan and actually
 * firing the checkout/plan-change — same InvoicePreview component
 * RegisterFlow.js uses, fed from whichever button (Subscribe / Switch Now
 * / At Renewal) set `pendingInvoice`. */
function InvoiceStep({ pendingInvoice, getDuration, getSeats, discountFor, appliedCoupon, gateway, checkingOut, gstin, onGstinChange, onBack, onProceed }) {
  const { plan, when } = pendingInvoice;
  const months = getDuration(plan);
  const tier = months > 1 ? plan.durationTiers?.find((t) => t.durationMonths === months) : null;
  const isPerUser = plan.pricing_model === "per_user";
  const seats = isPerUser ? getSeats(plan) : 1;
  const baseAmount = (tier ? Number(tier.price) * months : Number(plan.price)) * seats;
  const discount = discountFor(plan);
  const effectiveGateway = plan.hasBillDesk && plan.hasRazorpay ? gateway : plan.hasBillDesk ? "billdesk" : "razorpay";
  const busyKey = when ? `${plan.id}:${when}` : plan.id;
  return (
    <div className="p-6">
      <InvoicePreview
        planName={plan.name}
        billingLabel={months > 1 ? `Every ${months} months` : "Every 1 month"}
        currency={plan.currency}
        baseAmount={baseAmount}
        seatQuantity={isPerUser ? seats : null}
        perSeatAmount={isPerUser ? (tier ? tier.price : plan.price) : null}
        discountAmount={discount}
        discountLabel={appliedCoupon ? `Coupon (${appliedCoupon.code})` : undefined}
        gatewayLabel={GATEWAY_LABEL[effectiveGateway]}
        gstin={gstin}
        onGstinChange={onGstinChange}
        proceedLabel={when === "cycle_end" ? "Confirm — Switch at Renewal" : "Proceed to Pay"}
        onProceed={onProceed}
        onBack={onBack}
        busy={checkingOut === busyKey}
      />
    </div>
  );
}

/** Lets an existing per_user subscriber buy more (or fewer) seats without
 * going through "Change Plan" at all — the plan itself isn't changing,
 * just the purchased seat block. Shows its own compact invoice line
 * (base × new seats, discount unaffected — see updateCompanySeatQuantity's
 * own doc comment on why a prior coupon's per-seat rate just carries over)
 * rather than the full InvoicePreview, since there's no gateway/coupon
 * choice to make here, only a seat count. */
function ManageSeatsPanel({ subscription }) {
  const router = useRouter();
  const [seats, setSeats] = useState(subscription.seatQuantity || DEFAULT_SEATS);
  const [saving, setSaving] = useState(false);
  const changed = seats !== subscription.seatQuantity;

  async function save() {
    setSaving(true);
    try {
      const res = await apiFetch("/api/core/subscription/razorpay/seats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seatQuantity: seats }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't update seats.");
      toast.success(`Seats updated to ${seats}.`);
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border">
      <p className="text-foreground text-xs font-medium mb-2">Manage Seats</p>
      <div className="flex items-center gap-4 flex-wrap">
        <SeatStepper value={seats} onChange={setSeats} />
        {changed && (
          <button onClick={save} disabled={saving} className="btn-brand flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-medium cursor-pointer disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save ({seats} seats)
          </button>
        )}
      </div>
      <p className="text-muted-foreground text-[11px] mt-2">
        {subscription.currency} {withGst(Number(subscription.price) * seats).toLocaleString()}/mo for {seats} seats (incl. {GST_LABEL}), effective immediately.
      </p>
    </div>
  );
}

export default function SubscriptionManager({ subscription, plans, payments: initialPayments, canResume, autoCheckout }) {
  const router = useRouter();
  const timezone = useTimezone();
  // Arriving with ?checkoutPlan=… (see the public pricing page) opens the
  // picker immediately — PlanPickerModal's own effect then fires the real
  // checkout, so this isn't a second interactive step, just what makes the
  // modal (and its Razorpay overlay) exist on the page at all.
  const [showPicker, setShowPicker] = useState(!!autoCheckout);
  const [showHistory, setShowHistory] = useState(false);
  const [payments] = useState(initialPayments);
  const [busy, setBusy] = useState(false);
  const canManageSeats = subscription.pricingModel === "per_user" && subscription.gateway === "razorpay" && subscription.state === "active";

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
        <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> Secure payment powered by {gatewayTrustLabel(plans)}
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
        {subscription.hasSubscription && subscription.state !== "cancelled" && !subscription.cancelAtPeriodEnd && (
          <button onClick={cancel} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-red-400 text-xs font-medium cursor-pointer disabled:opacity-50 transition">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Cancel Subscription
          </button>
        )}
        <button onClick={() => setShowHistory((s) => !s)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground text-xs font-medium cursor-pointer transition">
          <Receipt className="h-3.5 w-3.5" /> Payment History
        </button>
      </div>

      {canManageSeats && <ManageSeatsPanel subscription={subscription} />}

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

      {showPicker && <PlanPickerModal plans={plans} currentPlanId={subscription.planId} subscriptionState={subscription.state} currentGateway={subscription.gateway} currentEndsAt={subscription.endsAt} timezone={timezone} onClose={() => setShowPicker(false)} autoCheckout={autoCheckout} />}
    </div>
  );
}
