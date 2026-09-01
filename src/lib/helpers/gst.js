/**
 * India GST on every subscription charge — 18%, added on top of the plan's
 * listed price (the listed price is GST-exclusive). Deliberately framework-
 * agnostic (no "server-only") since both the checkout UI (showing the
 * price breakdown before payment) and the actual billing code (computing
 * what Razorpay/BillDesk are told to charge) need the exact same number —
 * a display-only calculation that quietly drifted from what's actually
 * charged would be worse than not showing GST at all.
 */
export const GST_RATE = 0.18;
export const GST_LABEL = "GST (18%)";

export function gstAmount(baseAmount) {
  return Math.round(Number(baseAmount) * GST_RATE * 100) / 100;
}

export function withGst(baseAmount) {
  return Math.round(Number(baseAmount) * (1 + GST_RATE) * 100) / 100;
}
