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

/**
 * A visible {base, tax, total} breakdown for wherever a price is DISPLAYED
 * (pricing cards, plan pickers, invoices) — always computed FORWARD from
 * the true GST-exclusive base this app already stores, same as
 * withGst()/gstAmount() above. This is deliberately NOT a reverse
 * extraction off an already-inclusive number: given a tax-inclusive final
 * of, say, ₹100 at 18%, naively doing `100 - 18% of 100 = 82` and calling
 * ₹82 "the base" is wrong — re-adding 18% to ₹82 gives ₹96.76, not ₹100
 * back. (The correct inverse, if you ever only have the inclusive figure,
 * is base = total / 1.18, not total − total×rate.) This app never
 * actually needs that inverse, though — the exclusive base is always the
 * one true number on record, and every displayed/charged figure is
 * derived FROM it, forward, so the breakdown always foots exactly:
 * base + tax === total, every time.
 */
export function gstBreakdown(baseAmount) {
  const base = Math.round(Number(baseAmount) * 100) / 100;
  return { base, tax: gstAmount(base), total: withGst(base) };
}
