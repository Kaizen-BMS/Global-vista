import "server-only";
import crypto from "crypto";
import { razorpayFetch, isRazorpayConfigured } from "@/lib/payments/razorpayClient";
import { withGst } from "@/lib/helpers/gst";

/**
 * Razorpay Subscriptions API wrapper — one function per real Razorpay
 * operation, matching Razorpay's documented Plan -> Subscription
 * architecture. Every function does a real HTTP call; nothing here
 * fabricates a response.
 */

const PERIOD_BY_CYCLE = { monthly: "monthly", quarterly: "monthly", yearly: "yearly" };
const INTERVAL_BY_CYCLE = { monthly: 1, quarterly: 3, yearly: 1 };

/** Any whole number of months maps to a valid Razorpay period/interval —
 * 12/24/36 (Hostinger-style commitment tiers) collapse cleanly onto
 * period="yearly" with interval=months/12; anything not a multiple of 12
 * (including the plain 1-month case) uses period="monthly" with
 * interval=months. Razorpay bills `item.amount` once per that interval. */
function razorpayPeriodForMonths(months) {
  if (months % 12 === 0) return { period: "yearly", interval: months / 12 };
  return { period: "monthly", interval: months };
}

/** Same period/interval mapping for a plan's own billing_cycle (the
 * plain, no-commitment-tier case) — kept as one small lookup rather than
 * exporting PERIOD_BY_CYCLE/INTERVAL_BY_CYCLE separately, so a caller
 * always gets a matched {period, interval} pair, never one without the
 * other. Returns null for a billing_cycle Razorpay has no recurring
 * interval for (e.g. 'trial') — same case createRazorpayPlan itself
 * already rejects. */
export function billingCyclePeriod(billingCycle) {
  const period = PERIOD_BY_CYCLE[billingCycle];
  return period ? { period, interval: INTERVAL_BY_CYCLE[billingCycle] } : null;
}

/**
 * Razorpay requires a positive, finite total_count (max billing cycles) —
 * there's no "bill indefinitely" option — and separately enforces its own
 * absolute cap on a subscription's TOTAL real-world duration regardless of
 * how that's split into cycles. A fixed cycle count keyed only by a
 * "monthly/quarterly/yearly" label (the old approach here) breaks the
 * moment the interval is something that label was never designed for —
 * exactly what happened for a 36-month commitment tier (period="yearly",
 * interval=3): total_count stayed a flat 120 (the monthly default,
 * because a duration tier has no billing_cycle label to look up), so
 * Razorpay was asked for 120 cycles × 3 years = 360 years of billing and
 * rejected it outright ("Exceeds the maximum total_count
 * (33.333333333333) allowed for the given period and interval").
 * Targeting a fixed real-world horizon instead of a fixed cycle count
 * fixes this for every interval size at once: comfortably long enough
 * that cancellation (not the cap) is what actually ends billing in
 * practice, while automatically staying under Razorpay's real limit no
 * matter how long each individual cycle is.
 *
 * 10 years, floored at 3 cycles minimum — matches what a plain monthly
 * plan already used before any of this (120 cycles), so a 1-month
 * subscription's Razorpay Checkout still shows the same "billed until"
 * date it always has (Razorpay always shows one — there's no "renews
 * forever, no end date" option in their Subscriptions API, only a large
 * finite total_count). The floor of 3 is what keeps a multi-year
 * commitment tier (e.g. 36 months) getting more than a single term
 * before Razorpay's cap: 3 renewals of 3 years = 9 years, comfortably
 * under Razorpay's real limit (~33 cycles at this same interval, per the
 * error above) without the 360-year request that triggered it.
 */
const HORIZON_YEARS = 10;
function totalCountFor(period, interval) {
  if (!period || !(Number(interval) > 0)) {
    const e = new Error("createRazorpaySubscription requires a valid {period, interval}."); e.status = 500; throw e;
  }
  const cycleMonths = period === "yearly" ? interval * 12 : interval;
  return Math.max(3, Math.floor((HORIZON_YEARS * 12) / cycleMonths));
}

/** Creates the recurring Razorpay Plan for a CRM plan row. `plan` must have
 * price/currency/billing_cycle already resolved from the DB — never from
 * the browser. Amount is converted to the smallest currency unit (paise
 * for INR) as Razorpay requires.
 *
 * `periodOverride`/`intervalOverride`/`nameOverride` are used for
 * commitment-tier plans (see plan_duration_prices) — the Plan's period and
 * amount then reflect the CHOSEN TERM (e.g. "every 24 months, amount =
 * 24 x that tier's per-month price"), completely bypassing the plan row's
 * own billing_cycle/price, which stay the untouched 1-month default.
 */
export async function createRazorpayPlan(plan, { periodOverride, intervalOverride, nameOverride, amountOverride } = {}) {
  const period = periodOverride || PERIOD_BY_CYCLE[plan.billing_cycle];
  if (!period) { const e = new Error(`Plan "${plan.name}" has billing_cycle="${plan.billing_cycle}", which has no Razorpay recurring interval — only monthly/quarterly/yearly plans can be synced to Razorpay.`); e.status = 400; throw e; }
  const baseAmount = amountOverride != null ? amountOverride : Number(plan.price);
  if (!(baseAmount > 0)) { const e = new Error(`Plan "${plan.name}" has no positive price — free/trial plans are never synced to Razorpay.`); e.status = 400; throw e; }
  // GST is added here, at the one place every Razorpay Plan (base plan,
  // commitment tier, or a coupon's discounted throwaway plan) is actually
  // minted — so the real charge always includes it no matter which caller
  // built the pre-GST `baseAmount`, matching what gst.js shows on-screen.
  const amount = withGst(baseAmount);

  const data = await razorpayFetch("/plans", {
    method: "POST",
    body: {
      period,
      interval: intervalOverride || INTERVAL_BY_CYCLE[plan.billing_cycle],
      item: {
        name: nameOverride || `${plan.name} (${plan.billing_cycle})`,
        description: (plan.description || `${plan.name} subscription plan`).slice(0, 500),
        amount: Math.round(amount * 100),
        currency: plan.currency,
      },
      notes: { crm_plan_id: String(plan.id) },
    },
  });
  return data.id; // plan_XXXX
}

export { razorpayPeriodForMonths };

/** Creates a real Razorpay subscription. The browser opens Razorpay
 * Checkout with the returned id — Razorpay Checkout is a JS overlay, not a
 * redirect, so there's no return_url here (unlike PayPal). `quantity` is
 * Razorpay's own seat-count multiplier — the subscription charges
 * plan.item.amount × quantity per cycle, which is what makes per-user
 * pricing (see plans.pricing_model='per_user') a real recurring charge
 * instead of something this app would have to calculate and re-invoice
 * itself every cycle. */
export async function createRazorpaySubscription({ razorpayPlanId, period, interval, quantity = 1, customerEmail, customerName, customId }) {
  const data = await razorpayFetch("/subscriptions", {
    method: "POST",
    body: {
      plan_id: razorpayPlanId,
      quantity,
      total_count: totalCountFor(period, interval),
      customer_notify: 1,
      notes: { crm_reference: String(customId), customer_email: customerEmail || "", customer_name: customerName || "" },
    },
  });
  return { razorpaySubscriptionId: data.id, status: data.status };
}

/** Updates just the seat count on an already-authorized subscription —
 * called when a buyer changes their purchased seat block (see
 * updateCompanySeatQuantity), never auto-triggered by headcount changes.
 * "now" so the new count is reflected on the very next charge; Razorpay's
 * own proration (if any) for a quantity change mid-cycle is Razorpay's
 * documented behavior, not something this app calculates independently. */
export async function updateRazorpaySubscriptionQuantity(razorpaySubscriptionId, quantity) {
  return updateRazorpaySubscription(razorpaySubscriptionId, { quantity, scheduleChangeAt: "now" });
}

/** The ONLY function allowed to be treated as proof a subscription is real
 * — always fetches fresh from Razorpay, never trusts client-supplied status. */
export async function getRazorpaySubscription(razorpaySubscriptionId) {
  return razorpayFetch(`/subscriptions/${encodeURIComponent(razorpaySubscriptionId)}`);
}

/**
 * Razorpay's own upgrade/downgrade primitive — changes the Plan an
 * ALREADY-AUTHORIZED subscription bills against, instead of creating a
 * second, separate subscription (which is how this app used to handle a
 * plan switch, and which silently left the old subscription running and
 * billing forever since nothing ever cancelled it). `scheduleChangeAt`
 * is Razorpay's own documented parameter: "now" applies the new plan (and
 * its price) on the next charge immediately, "cycle_end" keeps the current
 * plan running until the paid-for period ends and only then switches —
 * exactly the two choices a company should get when changing plans.
 */
export async function updateRazorpaySubscription(razorpaySubscriptionId, { razorpayPlanId, quantity, scheduleChangeAt = "now" }) {
  const body = { schedule_change_at: scheduleChangeAt };
  if (razorpayPlanId) body.plan_id = razorpayPlanId;
  if (quantity != null) body.quantity = quantity;
  return razorpayFetch(`/subscriptions/${encodeURIComponent(razorpaySubscriptionId)}`, { method: "PATCH", body });
}

export async function cancelRazorpaySubscription(razorpaySubscriptionId, cancelAtCycleEnd = false) {
  return razorpayFetch(`/subscriptions/${encodeURIComponent(razorpaySubscriptionId)}/cancel`, {
    method: "POST",
    body: { cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 },
  });
}

export async function pauseRazorpaySubscription(razorpaySubscriptionId) {
  return razorpayFetch(`/subscriptions/${encodeURIComponent(razorpaySubscriptionId)}/pause`, {
    method: "POST",
    body: { pause_at: "now" },
  });
}

export async function resumeRazorpaySubscription(razorpaySubscriptionId) {
  return razorpayFetch(`/subscriptions/${encodeURIComponent(razorpaySubscriptionId)}/resume`, {
    method: "POST",
    body: { resume_at: "now" },
  });
}

/**
 * Verifies the checkout callback Razorpay's JS SDK returns to the browser
 * (razorpay_payment_id, razorpay_subscription_id, razorpay_signature).
 * Official Razorpay subscriptions signature formula:
 *   HMAC_SHA256(payment_id + "|" + subscription_id, key_secret) === signature
 * This is the server-side check that makes the browser's "success" callback
 * untrustworthy on its own — a forged callback without the real secret
 * can never produce a matching signature.
 */
export function verifyRazorpaySubscriptionSignature({ paymentId, subscriptionId, signature }) {
  if (!process.env.RAZORPAY_KEY_SECRET) { const e = new Error("RAZORPAY_KEY_SECRET is not configured."); e.status = 503; throw e; }
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${paymentId}|${subscriptionId}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || "")));
}

/** Webhook signature verification — HMAC-SHA256 of the RAW request body
 * using the webhook secret, compared to the X-Razorpay-Signature header.
 * Must be computed against the exact raw bytes Razorpay sent, before any
 * JSON parsing, or the signature will never match. */
export function verifyRazorpayWebhookSignature(rawBody, signatureHeader) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) { const e = new Error("RAZORPAY_WEBHOOK_SECRET is not configured — cannot verify webhook signatures."); e.status = 503; throw e; }
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signatureHeader || "")));
  } catch {
    return false; // length mismatch etc. — never let a malformed header throw past this into "verified"
  }
}

export { isRazorpayConfigured };
