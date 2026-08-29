import "server-only";
import crypto from "crypto";
import { razorpayFetch, isRazorpayConfigured } from "@/lib/payments/razorpayClient";

/**
 * Razorpay Subscriptions API wrapper — one function per real Razorpay
 * operation, matching Razorpay's documented Plan -> Subscription
 * architecture. Every function does a real HTTP call; nothing here
 * fabricates a response.
 */

const PERIOD_BY_CYCLE = { monthly: "monthly", quarterly: "monthly", yearly: "yearly" };
// Razorpay requires a positive total_count (max billing cycles) — there is
// no "bill indefinitely" option. These are generous horizons chosen so a
// subscription effectively never hits the cap in practice; cancellation is
// what actually ends billing, same as with PayPal's total_cycles=0 pattern.
const TOTAL_COUNT_BY_CYCLE = { monthly: 120, quarterly: 40, yearly: 20 };
const INTERVAL_BY_CYCLE = { monthly: 1, quarterly: 3, yearly: 1 };

/** Creates the recurring Razorpay Plan for a CRM plan row. `plan` must have
 * price/currency/billing_cycle already resolved from the DB — never from
 * the browser. Amount is converted to the smallest currency unit (paise
 * for INR) as Razorpay requires. */
export async function createRazorpayPlan(plan) {
  const period = PERIOD_BY_CYCLE[plan.billing_cycle];
  if (!period) { const e = new Error(`Plan "${plan.name}" has billing_cycle="${plan.billing_cycle}", which has no Razorpay recurring interval — only monthly/quarterly/yearly plans can be synced to Razorpay.`); e.status = 400; throw e; }
  if (!(Number(plan.price) > 0)) { const e = new Error(`Plan "${plan.name}" has no positive price — free/trial plans are never synced to Razorpay.`); e.status = 400; throw e; }

  const data = await razorpayFetch("/plans", {
    method: "POST",
    body: {
      period,
      interval: INTERVAL_BY_CYCLE[plan.billing_cycle],
      item: {
        name: `${plan.name} (${plan.billing_cycle})`,
        description: (plan.description || `${plan.name} subscription plan`).slice(0, 500),
        amount: Math.round(Number(plan.price) * 100),
        currency: plan.currency,
      },
      notes: { crm_plan_id: String(plan.id) },
    },
  });
  return data.id; // plan_XXXX
}

/** Creates a real Razorpay subscription. The browser opens Razorpay
 * Checkout with the returned id — Razorpay Checkout is a JS overlay, not a
 * redirect, so there's no return_url here (unlike PayPal). */
export async function createRazorpaySubscription({ razorpayPlanId, billingCycle, customerEmail, customerName, customId }) {
  const data = await razorpayFetch("/subscriptions", {
    method: "POST",
    body: {
      plan_id: razorpayPlanId,
      total_count: TOTAL_COUNT_BY_CYCLE[billingCycle] || 120,
      customer_notify: 1,
      notes: { crm_reference: String(customId), customer_email: customerEmail || "", customer_name: customerName || "" },
    },
  });
  return { razorpaySubscriptionId: data.id, status: data.status };
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
export async function updateRazorpaySubscription(razorpaySubscriptionId, { razorpayPlanId, scheduleChangeAt = "now" }) {
  return razorpayFetch(`/subscriptions/${encodeURIComponent(razorpaySubscriptionId)}`, {
    method: "PATCH",
    body: { plan_id: razorpayPlanId, schedule_change_at: scheduleChangeAt },
  });
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
