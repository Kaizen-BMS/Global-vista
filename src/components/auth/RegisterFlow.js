"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Building2, User, CreditCard, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { loadRazorpayScript } from "@/lib/helpers/loadRazorpayScript";
import { withGst, GST_LABEL } from "@/lib/helpers/gst";
import { DEFAULT_SEATS } from "@/lib/helpers/seats";
import InvoicePreview from "@/components/billing/InvoicePreview";
import SeatStepper from "@/components/billing/SeatStepper";

const GATEWAY_LABEL = { billdesk: "BillDesk", razorpay: "Razorpay" };
const STEPS = ["Company", "Admin", "Plan", "Confirm"];
const inputClass = "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
function Field({ label, children }) { return (<div><label className="block text-white/50 text-xs mb-1.5">{label}</label>{children}</div>); }

/** Same show/hide interaction as FloatingInput's password fields on the
 * Login page — Register's Admin step used plain always-masked inputs, with
 * no way to check for typos before submitting. */
function PasswordField({ value, onChange, required, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        required={required}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className={`${inputClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer transition-colors"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function RegisterFlow() {
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    companyName: "", companyEmail: "", companyPhone: "", companyWebsite: "", companyCountry: "", companyState: "", companyCity: "", companyAddress: "",
    adminName: "", adminEmail: "", adminPhone: "", adminPassword: "", confirmPassword: "",
    planId: "", gateway: "", couponCode: "", durationMonths: 1, seatQuantity: DEFAULT_SEATS, gstin: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountType, discountValue }
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    apiFetch("/api/public/plans").then((r) => r.json()).then((d) => {
      setPlans(d.plans || []);
      const first = d.plans?.[0];
      if (first) {
        const onlyGateway = first.hasBillDesk && !first.hasRazorpay ? "billdesk" : first.hasRazorpay && !first.hasBillDesk ? "razorpay" : "";
        setForm((f) => ({ ...f, planId: String(first.id), gateway: onlyGateway }));
      }
    }).catch(() => toast.error("Couldn't load plans.")).finally(() => setLoadingPlans(false));
  }, []);

  const selectedPlan = plans.find((p) => String(p.id) === String(form.planId));
  const planRequiresPayment = selectedPlan && Number(selectedPlan.price) > 0 && selectedPlan.billing_cycle !== "trial";
  const bothGatewaysAvailable = !!(selectedPlan?.hasBillDesk && selectedPlan?.hasRazorpay);
  // When only one gateway is connected to this plan, that's simply the one
  // used — no choice to make. When neither is, the server rejects at submit
  // with a clear message rather than the client guessing.
  const effectiveGateway = bothGatewaysAvailable ? form.gateway : selectedPlan?.hasBillDesk ? "billdesk" : selectedPlan?.hasRazorpay ? "razorpay" : "";

  // Commitment tiers only exist on Razorpay (BillDesk's one-time
  // order-create has no recurring-Plan concept to attach a longer interval
  // to) — the 1-month option is always available (it's just the plan's own
  // price), longer ones only when the operator has configured them.
  const durationOptions = selectedPlan && effectiveGateway === "razorpay"
    ? [{ months: 1, price: selectedPlan.price }, ...(selectedPlan.durationTiers || []).map((t) => ({ months: t.durationMonths, price: t.price }))].sort((a, b) => a.months - b.months)
    : [{ months: 1, price: selectedPlan?.price }];
  const selectedDurationOption = durationOptions.find((o) => o.months === form.durationMonths) || durationOptions[0];

  function selectPlan(id) {
    const plan = plans.find((p) => String(p.id) === String(id));
    const onlyGateway = plan?.hasBillDesk && !plan?.hasRazorpay ? "billdesk" : plan?.hasRazorpay && !plan?.hasBillDesk ? "razorpay" : "";
    setForm((f) => ({ ...f, planId: String(id), gateway: onlyGateway, durationMonths: 1, seatQuantity: DEFAULT_SEATS }));
    setAppliedCoupon(null); setCouponError("");
  }
  const isPerUser = selectedPlan?.pricing_model === "per_user";
  const seats = isPerUser ? form.seatQuantity : 1;

  /** Same reasoning as SubscriptionManager.js's own applyCoupon — validates
   * against the currently selected plan so the exact discount/final price
   * shows up right here, before the real checkout (which only happens
   * after the account is created) ever starts. Coupons only ever discount
   * the 1-month price, so this is only offered at durationMonths === 1. */
  async function applyCoupon() {
    const code = form.couponCode.trim();
    if (!code || !selectedPlan) return;
    setCouponChecking(true);
    setCouponError("");
    try {
      const res = await apiFetch("/api/public/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, planId: selectedPlan.id, seatQuantity: seats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid coupon code.");
      setAppliedCoupon({ code: data.code, discountType: data.discountType, discountValue: data.discountValue });
      toast.success(`Coupon "${data.code}" applied.`);
    } catch (err) { setCouponError(err.message); setAppliedCoupon(null); } finally { setCouponChecking(false); }
  }
  function removeCoupon() { setAppliedCoupon(null); set("couponCode", ""); setCouponError(""); }
  // Discounts the whole seat-multiplied total ONCE (never once per seat) —
  // same rule the server applies, see coupons.js/razorpayBilling.js.
  const couponBaseAmount = selectedPlan ? Number(selectedPlan.price) * seats : 0;
  const couponDiscount = appliedCoupon && selectedPlan && form.durationMonths === 1
    ? Math.min(
        Math.round((appliedCoupon.discountType === "percent" ? (couponBaseAmount * appliedCoupon.discountValue) / 100 : appliedCoupon.discountValue) * 100) / 100,
        couponBaseAmount
      )
    : 0;

  function validateStep(i) {
    if (i === 0 && (!form.companyName.trim())) { toast.error("Company name is required."); return false; }
    if (i === 1) {
      if (!form.adminName.trim()) { toast.error("Your name is required."); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) { toast.error("A valid email is required."); return false; }
      if (form.adminPassword.length < 8) { toast.error("Password must be at least 8 characters."); return false; }
      if (form.adminPassword !== form.confirmPassword) { toast.error("Passwords do not match."); return false; }
    }
    if (i === 2) {
      if (!form.planId) { toast.error("Select a plan."); return false; }
      if (planRequiresPayment && bothGatewaysAvailable && !form.gateway) { toast.error("Choose a payment method."); return false; }
      if (planRequiresPayment && !selectedPlan.hasBillDesk && !selectedPlan.hasRazorpay) { toast.error("This plan isn't connected to a payment method yet — please contact us."); return false; }
    }
    return true;
  }

  function next() { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

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
          // Same rule as everywhere else in this app: Razorpay Checkout
          // reporting success is NOT proof of payment — the server
          // re-derives the HMAC signature and re-fetches the subscription
          // from Razorpay before ever marking it active.
          try {
            const verifyRes = await apiFetch("/api/public/register/razorpay-verify", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpaySubscriptionId: response.razorpay_subscription_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed. Please contact support.");
            setResult(data);
          } catch (err) { toast.error(err.message); }
          finally { setSubmitting(false); }
        },
        modal: { ondismiss: () => setSubmitting(false) },
      });
      rzp.on("payment.failed", () => { toast.error("Payment could not be completed. Please try again."); setSubmitting(false); });
      rzp.open();
    } catch (err) { toast.error(err.message); setSubmitting(false); }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/public/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, gateway: effectiveGateway }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");

      if (data.requiresPayment && data.gateway === "billdesk") {
        // Company + admin account already exist at this point (see
        // registerCompany) with subscriptionStatus="pending" — no modules
        // are enabled yet. Redirecting to BillDesk now (component unmounts
        // on navigation, so `submitting` intentionally stays true rather
        // than flickering the button back to enabled just before the
        // browser leaves); nothing here treats this redirect itself as
        // proof of payment — /register/confirm re-verifies with BillDesk
        // server-side once the browser returns.
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.requiresPayment && data.gateway === "razorpay") {
        // Razorpay Checkout is an in-page modal, not a redirect — the
        // company/admin already exist (pending) the same as the BillDesk
        // path; this just opens the modal right here instead of navigating
        // away, and shows the success screen once verified.
        await payWithRazorpayThenFinish(data);
        return;
      }

      setResult(data);
      setSubmitting(false);
    } catch (err) {
      toast.error(err.message);
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
        <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-white mb-1.5">Your company has been successfully created.</h1>
        <p className="text-white/50 text-sm mb-6">Welcome to KaizenBMS Platform, {result.companyName}.</p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
          <div className="flex justify-between"><span className="text-white/40">Company</span><span className="text-white">{result.companyName}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Plan</span><span className="text-white">{result.planName}</span></div>
          {result.trialStart && <div className="flex justify-between"><span className="text-white/40">Trial Start</span><span className="text-white">{result.trialStart}</span></div>}
          {result.trialEnd && <div className="flex justify-between"><span className="text-white/40">Trial Expiry</span><span className="text-white">{result.trialEnd}</span></div>}
          {result.daysRemaining != null && <div className="flex justify-between"><span className="text-white/40">Days Remaining</span><span className="text-white">{result.daysRemaining}</span></div>}
        </div>
        <Link href="/login" className="group w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-medium transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_24px_rgba(99,102,241,0.45)]">
          Log In <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-1.5">Start your company today</h1>
      <p className="text-white/50 text-sm mb-6">Set up your KaizenBMS Platform workspace in a few steps.</p>

      <div className="flex items-center gap-2 mb-7">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-indigo-500" : "bg-white/10"}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
          {step === 0 && (
            <>
              <p className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide mb-1"><Building2 className="h-3.5 w-3.5" /> Company Information</p>
              <Field label="Company Name *"><input required autoFocus value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={inputClass} /></Field>
              <p className="text-white/30 text-xs">That's all we need to get started — email, phone, address and the rest can be filled in later from Settings once you're inside your workspace.</p>
            </>
          )}

          {step === 1 && (
            <>
              <p className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide mb-1"><User className="h-3.5 w-3.5" /> Administrator Account</p>
              <Field label="Full Name *"><input required value={form.adminName} onChange={(e) => set("adminName", e.target.value)} className={inputClass} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email *"><input required type="email" value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} className={inputClass} /></Field>
                <Field label="Phone"><input value={form.adminPhone} onChange={(e) => set("adminPhone", e.target.value)} className={inputClass} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Password *"><PasswordField required autoComplete="new-password" value={form.adminPassword} onChange={(e) => set("adminPassword", e.target.value)} /></Field>
                <Field label="Confirm Password *"><PasswordField required autoComplete="new-password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} /></Field>
              </div>
              <p className="text-white/30 text-xs">You&apos;ll be the Company Super Admin — full control over your workspace.</p>
            </>
          )}

          {step === 2 && (
            <>
              <p className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide mb-1"><CreditCard className="h-3.5 w-3.5" /> Choose a Plan</p>
              {loadingPlans ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
              ) : plans.length === 0 ? (
                <p className="text-white/40 text-sm">No plans are available right now — please contact us.</p>
              ) : (
                <div className="space-y-2">
                  {plans.map((p) => (
                    <label key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${String(form.planId) === String(p.id) ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                      <input type="radio" name="plan" checked={String(form.planId) === String(p.id)} onChange={() => selectPlan(p.id)} className="mt-1 accent-indigo-500 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-white text-sm font-medium">{p.name}</p>
                          <p className="text-white text-sm">{p.price ? `${p.currency} ${withGst(p.price)}${p.pricing_model === "per_user" ? "/user/mo" : `/${p.billing_cycle === "yearly" ? "yr" : "mo"}`}` : "Free"}</p>
                        </div>
                        {p.description && <p className="text-white/50 text-xs mt-0.5">{p.description}</p>}
                        <p className="text-white/40 text-xs mt-0.5">
                          {p.trial_days ? `${p.trial_days}-day free trial · ` : ""}
                          {p.pricing_model === "per_user" ? "5 users min" : p.max_users ? `${p.max_users} users` : "Unlimited users"} · {p.max_leads ? `${p.max_leads} leads` : "Unlimited leads"} · {p.max_storage_mb ? `${(p.max_storage_mb / 1024).toFixed(1)} GB` : "Unlimited storage"}
                          {p.price ? ` · incl. ${GST_LABEL}` : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {isPerUser && (
                <div className="pt-1">
                  <SeatStepper dark value={form.seatQuantity} onChange={(v) => set("seatQuantity", v)} />
                </div>
              )}

              {planRequiresPayment && effectiveGateway === "razorpay" && durationOptions.length > 1 && (
                <div className="pt-1">
                  <p className="text-white/50 text-xs mb-1.5">Commitment length</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {durationOptions.map((opt) => (
                      <button
                        key={opt.months} type="button" onClick={() => set("durationMonths", opt.months)}
                        className={`px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition text-center ${form.durationMonths === opt.months ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"}`}
                      >
                        <p className="font-medium">{opt.months} {opt.months === 1 ? "month" : "months"}</p>
                        <p className="text-white/40">{selectedPlan.currency} {withGst(opt.price)}{isPerUser ? "/user/mo" : "/mo"}</p>
                      </button>
                    ))}
                  </div>
                  {selectedDurationOption && selectedDurationOption.months > 1 && (
                    <p className="text-white/40 text-xs mt-1.5">
                      Billed {selectedPlan.currency} {withGst(Number(selectedDurationOption.price) * selectedDurationOption.months * seats).toLocaleString()} every {selectedDurationOption.months} months{isPerUser ? ` (${seats} users)` : ""} (incl. {GST_LABEL}).
                    </p>
                  )}
                </div>
              )}

              {planRequiresPayment && bothGatewaysAvailable && (
                <div className="pt-1">
                  <p className="text-white/50 text-xs mb-1.5">Payment method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["billdesk", "razorpay"].map((gw) => (
                      <button
                        key={gw} type="button" onClick={() => set("gateway", gw)}
                        className={`px-3 py-2 rounded-lg border text-sm cursor-pointer transition ${form.gateway === gw ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"}`}
                      >
                        {GATEWAY_LABEL[gw]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {planRequiresPayment && (
                <>
                  <Field label="Coupon Code (optional)">
                    {appliedCoupon ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {appliedCoupon.code} — {appliedCoupon.discountType === "percent" ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue} off`}
                        </span>
                        <button type="button" onClick={removeCoupon} className="text-white/40 hover:text-white text-xs cursor-pointer">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input value={form.couponCode} onChange={(e) => { set("couponCode", e.target.value.toUpperCase()); setCouponError(""); }} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())} placeholder="e.g. SAVE20" className={inputClass} />
                        <button type="button" onClick={applyCoupon} disabled={couponChecking || !form.couponCode.trim()} className="px-4 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium cursor-pointer disabled:opacity-50 transition shrink-0">
                          {couponChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="text-red-400 text-xs mt-1">{couponError}</p>}
                    {appliedCoupon && form.durationMonths !== 1 && <p className="text-amber-300 text-xs mt-1">Coupons only apply to monthly billing — switch to 1 month to use it.</p>}
                  </Field>
                  <p className="flex items-center gap-1.5 text-white/40 text-xs pt-1"><ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> Secure payment powered by {GATEWAY_LABEL[effectiveGateway] || "BillDesk or Razorpay"}</p>
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide mb-1">Review</p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-white/40">Company</span><span className="text-white">{form.companyName}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Admin</span><span className="text-white">{form.adminName} ({form.adminEmail})</span></div>
                {selectedPlan?.trial_days ? (
                  <div className="flex justify-between"><span className="text-white/40">Trial</span><span className="text-white">{selectedPlan.trial_days} days, starting today</span></div>
                ) : null}
              </div>
              {planRequiresPayment ? (
                <InvoicePreview
                  dark
                  planName={selectedPlan?.name}
                  billingLabel={selectedDurationOption && selectedDurationOption.months > 1 ? `Every ${selectedDurationOption.months} months` : `Every 1 month`}
                  currency={selectedPlan?.currency}
                  baseAmount={(selectedDurationOption && selectedDurationOption.months > 1 ? Number(selectedDurationOption.price) * selectedDurationOption.months : Number(selectedPlan?.price)) * seats}
                  seatQuantity={isPerUser ? seats : null}
                  perSeatAmount={isPerUser ? selectedPlan?.price : null}
                  discountAmount={couponDiscount}
                  discountLabel={appliedCoupon ? `Coupon (${appliedCoupon.code})` : undefined}
                  gatewayLabel={GATEWAY_LABEL[effectiveGateway]}
                  gstin={form.gstin}
                  onGstinChange={(v) => set("gstin", v)}
                  proceedLabel="Proceed to Pay"
                  onProceed={submit}
                  onBack={back}
                  busy={submitting}
                />
              ) : (
                <p className="text-white/30 text-xs">No payment required — your trial starts immediately after you submit.</p>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Step 3's own InvoicePreview supplies its own Back/Proceed-to-Pay
          buttons when payment is required, so this shared nav row only
          renders for the free-trial confirm case (and every earlier step). */}
      {!(step === STEPS.length - 1 && planRequiresPayment) && (
        <div className="flex items-center justify-between mt-7">
          {step > 0 ? (
            <button type="button" onClick={back} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm cursor-pointer transition"><ArrowLeft className="h-4 w-4" /> Back</button>
          ) : <span />}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium cursor-pointer bg-indigo-600 hover:bg-indigo-500 transition">
              Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium cursor-pointer bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Create Company
            </button>
          )}
        </div>
      )}

      <p className="text-center text-white/35 text-xs mt-8">
        Already have an account? <Link href="/login" className="text-white/60 hover:text-white">Log in</Link>
      </p>
    </div>
  );
}
