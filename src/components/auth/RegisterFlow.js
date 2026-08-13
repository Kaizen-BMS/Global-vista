"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Building2, User, CreditCard, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const STEPS = ["Company", "Admin", "Plan", "Confirm"];
const inputClass = "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
function Field({ label, children }) { return (<div><label className="block text-white/50 text-xs mb-1.5">{label}</label>{children}</div>); }

export default function RegisterFlow() {
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    companyName: "", companyEmail: "", companyPhone: "", companyWebsite: "", companyCountry: "", companyState: "", companyCity: "", companyAddress: "",
    adminName: "", adminEmail: "", adminPhone: "", adminPassword: "", confirmPassword: "",
    planId: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    apiFetch("/api/public/plans").then((r) => r.json()).then((d) => {
      setPlans(d.plans || []);
      if (d.plans?.length) set("planId", String(d.plans[0].id));
    }).catch(() => toast.error("Couldn't load plans.")).finally(() => setLoadingPlans(false));
  }, []);

  function validateStep(i) {
    if (i === 0 && (!form.companyName.trim())) { toast.error("Company name is required."); return false; }
    if (i === 1) {
      if (!form.adminName.trim()) { toast.error("Your name is required."); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) { toast.error("A valid email is required."); return false; }
      if (form.adminPassword.length < 8) { toast.error("Password must be at least 8 characters."); return false; }
      if (form.adminPassword !== form.confirmPassword) { toast.error("Passwords do not match."); return false; }
    }
    if (i === 2 && !form.planId) { toast.error("Select a plan."); return false; }
    return true;
  }

  function next() { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  const selectedPlan = plans.find((p) => String(p.id) === String(form.planId));
  const planRequiresPayment = selectedPlan && Number(selectedPlan.price) > 0 && selectedPlan.billing_cycle !== "trial";

  async function submit() {
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/public/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");
      setResult(data);
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
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
              <Field label="Company Name *"><input required value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={inputClass} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company Email"><input type="email" value={form.companyEmail} onChange={(e) => set("companyEmail", e.target.value)} className={inputClass} /></Field>
                <Field label="Company Phone"><input value={form.companyPhone} onChange={(e) => set("companyPhone", e.target.value)} className={inputClass} /></Field>
              </div>
              <Field label="Website"><input value={form.companyWebsite} onChange={(e) => set("companyWebsite", e.target.value)} placeholder="https://" className={inputClass} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Country"><input value={form.companyCountry} onChange={(e) => set("companyCountry", e.target.value)} className={inputClass} /></Field>
                <Field label="State"><input value={form.companyState} onChange={(e) => set("companyState", e.target.value)} className={inputClass} /></Field>
                <Field label="City"><input value={form.companyCity} onChange={(e) => set("companyCity", e.target.value)} className={inputClass} /></Field>
              </div>
              <Field label="Address"><input value={form.companyAddress} onChange={(e) => set("companyAddress", e.target.value)} className={inputClass} /></Field>
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
                <Field label="Password *"><input required type="password" value={form.adminPassword} onChange={(e) => set("adminPassword", e.target.value)} className={inputClass} /></Field>
                <Field label="Confirm Password *"><input required type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} className={inputClass} /></Field>
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
                      <input type="radio" name="plan" checked={String(form.planId) === String(p.id)} onChange={() => set("planId", String(p.id))} className="mt-1 accent-indigo-500 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-white text-sm font-medium">{p.name}</p>
                          <p className="text-white text-sm">{p.price ? `${p.currency} ${p.price}/${p.billing_cycle === "yearly" ? "yr" : "mo"}` : "Free"}</p>
                        </div>
                        <p className="text-white/40 text-xs mt-0.5">
                          {p.trial_days ? `${p.trial_days}-day free trial · ` : ""}
                          {p.max_users ? `${p.max_users} users` : "Unlimited users"} · {p.max_leads ? `${p.max_leads} leads` : "Unlimited leads"} · {p.max_storage_mb ? `${(p.max_storage_mb / 1024).toFixed(1)} GB` : "Unlimited storage"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide mb-1">Review</p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-white/40">Company</span><span className="text-white">{form.companyName}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Admin</span><span className="text-white">{form.adminName} ({form.adminEmail})</span></div>
                <div className="flex justify-between"><span className="text-white/40">Plan</span><span className="text-white">{selectedPlan?.name}</span></div>
                {selectedPlan?.trial_days ? (
                  <div className="flex justify-between"><span className="text-white/40">Trial</span><span className="text-white">{selectedPlan.trial_days} days, starting today</span></div>
                ) : null}
              </div>
              {planRequiresPayment ? (
                <p className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  This plan requires payment, and self-service payment isn&apos;t available yet. Please contact us to get started on this plan, or go back and choose a free/trial plan.
                </p>
              ) : (
                <p className="text-white/30 text-xs">No payment required — your trial starts immediately after you submit.</p>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between mt-7">
        {step > 0 ? (
          <button type="button" onClick={back} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm cursor-pointer transition"><ArrowLeft className="h-4 w-4" /> Back</button>
        ) : <span />}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium cursor-pointer bg-indigo-600 hover:bg-indigo-500 transition">
            Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={submitting || planRequiresPayment} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium cursor-pointer bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Create Company
          </button>
        )}
      </div>

      <p className="text-center text-white/35 text-xs mt-8">
        Already have an account? <Link href="/login" className="text-white/60 hover:text-white">Log in</Link>
      </p>
    </div>
  );
}
