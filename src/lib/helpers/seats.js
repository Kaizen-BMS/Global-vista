/**
 * The seat-block rule for every `pricing_model = 'per_user'` plan: a
 * company buys a block of seats (never bills against raw, fluctuating
 * headcount), starting at 5 — the account owner counts as the first seat
 * in that block — adjustable only in further steps of 5. Deliberately
 * framework-agnostic (no "server-only") — the same constants and
 * normalization run in the checkout UI and in the server-side billing
 * code that actually computes the charge, so they can never drift apart.
 */
export const DEFAULT_SEATS = 5;
export const SEAT_STEP = 5;

export function isValidSeatQuantity(n) {
  const v = Number(n);
  return Number.isInteger(v) && v > 0 && v % SEAT_STEP === 0;
}

/** Rounds up to the nearest valid step, floored at DEFAULT_SEATS — used
 * to coerce any stray/out-of-band value (a manual API call, old saved
 * state) back onto the rule rather than rejecting it outright. */
export function normalizeSeatQuantity(n) {
  const v = Math.round(Number(n) || 0);
  if (v <= DEFAULT_SEATS) return DEFAULT_SEATS;
  return Math.ceil(v / SEAT_STEP) * SEAT_STEP;
}
