"use client";
import { useState } from "react";
import { Loader2, ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { withGst, gstAmount, GST_LABEL } from "@/lib/helpers/gst";
import { validateGstin, normalizeGstin } from "@/lib/helpers/gstin";
import CurrencyConverter from "@/components/billing/CurrencyConverter";

/**
 * The price breakdown shown right before a real charge is authorized —
 * used both by RegisterFlow (sign-up + first subscription in one flow)
 * and SubscriptionManager's PlanPickerModal (an existing company changing
 * plans). Deliberately a PREVIEW, not a generated tax document: no
 * invoice number is minted here (that would imply a record that doesn't
 * exist yet) — the real receipt/invoice is whatever the gateway + this
 * app's own subscription_payments row produce once payment actually
 * clears, which is what Payment History / the emailed receipt shows.
 *
 * `baseAmount` is the pre-GST, pre-rounding amount for ONE full billing
 * cycle — already the seat-multiplied total for a per-user plan (price/
 * seat × seats × months, computed by the caller) and already netted for a
 * coupon, if any — this is the single number gst.js's withGst()/
 * gstAmount() both derive from, so the "Subtotal" / "GST" / "Total" lines
 * here always foot exactly the same way the actual charge is computed
 * server-side: (amount/user × users × months) − discount = Subtotal;
 * Subtotal + 18% GST = Total due.
 *
 * The GSTIN field is for the buyer's own tax record on the invoice only —
 * GST is charged the same regardless of whether it's filled in or valid
 * (see gstin.js's own doc comment); it never gates or changes `total`.
 */
export default function InvoicePreview({
  dark = false, planName, billingLabel, currency = "INR", baseAmount,
  seatQuantity = null, perSeatAmount = null,
  discountAmount = 0, discountLabel, gatewayLabel, proceedLabel = "Proceed to Pay",
  gstin = "", onGstinChange,
  onProceed, onBack, busy = false,
}) {
  const netBase = Math.max(0, Number(baseAmount) - Number(discountAmount || 0));
  const gst = gstAmount(netBase);
  const total = withGst(netBase);
  const [gstinTouched, setGstinTouched] = useState(false);
  const gstinCheck = gstin ? validateGstin(gstin) : null;

  const panel = dark ? "bg-white/5 border-white/10" : "bg-muted/30 border-border";
  const rule = dark ? "border-white/10" : "border-border";
  const faint = dark ? "text-white/40" : "text-muted-foreground";
  const strong = dark ? "text-white" : "text-foreground";
  const label = dark ? "text-white/70" : "text-foreground";
  const inputClass = dark
    ? "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    : "w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border ${panel} overflow-hidden`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${rule}`}>
          <p className={`text-sm font-semibold ${label}`}>Invoice Preview</p>
          <span className={`text-[10px] uppercase tracking-wide ${faint}`}>Not yet charged</span>
        </div>
        <div className="px-4 py-3 space-y-2 text-sm">
          <div className="flex justify-between"><span className={faint}>Plan</span><span className={strong}>{planName}</span></div>
          <div className="flex justify-between"><span className={faint}>Billing</span><span className={strong}>{billingLabel}</span></div>
          {!!seatQuantity && (
            <div className="flex justify-between">
              <span className={faint}>Users</span>
              <span className={strong}>{seatQuantity} {seatQuantity === 1 ? "seat" : "seats"}{perSeatAmount != null ? ` (${currency} ${Number(perSeatAmount).toLocaleString()}/user/mo)` : ""}</span>
            </div>
          )}
          {gatewayLabel && <div className="flex justify-between"><span className={faint}>Payment via</span><span className={strong}>{gatewayLabel}</span></div>}
        </div>
        <div className={`px-4 py-3 border-t ${rule} space-y-1.5 text-sm`}>
          <div className="flex justify-between"><span className={faint}>Subtotal</span><span className={strong}>{currency} {Number(baseAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-400"><span>{discountLabel || "Discount"}</span><span>−{currency} {Number(discountAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          )}
          <div className="flex justify-between"><span className={faint}>{GST_LABEL}</span><span className={strong}>{currency} {gst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          <div className={`flex justify-between pt-2 mt-1 border-t ${rule} text-base font-semibold`}>
            <span className={strong}>Total due</span><span className={strong}>{currency} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        {currency === "INR" && (
          <div className={`px-4 py-3 border-t ${rule}`}>
            <CurrencyConverter amountInr={total} dark={dark} />
          </div>
        )}
        {onGstinChange && (
          <div className={`px-4 py-3 border-t ${rule}`}>
            <label className={`block text-xs mb-1.5 ${faint}`}>GSTIN (optional — for your invoice record; GST is charged either way)</label>
            <div className="relative">
              <input
                value={gstin}
                onChange={(e) => onGstinChange(normalizeGstin(e.target.value))}
                onBlur={() => setGstinTouched(true)}
                maxLength={15}
                placeholder="e.g. 27AAPFU0939F1ZV"
                className={`${inputClass} pr-8 uppercase tracking-wide`}
              />
              {gstin && gstinCheck && (
                gstinCheck.valid
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  : <AlertCircle className="h-4 w-4 text-amber-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
            </div>
            {gstin && gstinTouched && gstinCheck && !gstinCheck.valid && (
              <p className="text-amber-400 text-xs mt-1">{gstinCheck.reason} You can still proceed — GST is charged regardless.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} disabled={busy} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium cursor-pointer disabled:opacity-50 transition ${dark ? "border-white/10 text-white/70 hover:bg-white/5" : "border-border text-foreground hover:bg-muted"}`}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}
        <button type="button" onClick={onProceed} disabled={busy} className="btn-brand flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 cursor-pointer">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {proceedLabel}
        </button>
      </div>
      <p className={`flex items-center gap-1.5 text-xs ${faint}`}><ShieldCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0" /> {gatewayLabel ? `Secure payment powered by ${gatewayLabel}.` : "Secure payment."} A receipt is emailed once payment is confirmed.</p>
    </div>
  );
}
