import "server-only";
import { paypalFetch, isPayPalConfigured } from "@/lib/payments/paypalClient";

/**
 * PayPal Billing Plans / Subscriptions API (v1) wrapper — one function per
 * real PayPal operation, matching PayPal's own documented Subscriptions
 * architecture exactly (Product -> Billing Plan -> Subscription). Every
 * function here does a real HTTP call; nothing here fabricates a response.
 */

const INTERVAL_BY_CYCLE = { monthly: "MONTH", yearly: "YEAR" };

/** Creates the PayPal Product this plan will bill against, once. Callers
 * must persist the returned id (plans.paypal_product_id) — this function
 * itself does not check for an existing one, so it must only be called
 * when the caller has already confirmed none exists (see syncPlanToPayPal). */
export async function createPayPalProduct(plan) {
  const { data } = await paypalFetch("/v1/catalogs/products", {
    method: "POST",
    idempotencyKey: `product-plan-${plan.id}-${Date.now()}`,
    body: {
      name: plan.name,
      description: (plan.description || `${plan.name} subscription plan`).slice(0, 256),
      type: "SERVICE",
      category: "SOFTWARE",
    },
  });
  return data.id; // PRODUCT-XXXX
}

/** Creates the recurring Billing Plan for a CRM plan row. `plan` must have
 * price/currency/billing_cycle/trial_days already resolved from the DB —
 * never from the browser. */
export async function createPayPalBillingPlan(plan, paypalProductId) {
  const interval = INTERVAL_BY_CYCLE[plan.billing_cycle];
  if (!interval) { const e = new Error(`Plan "${plan.name}" has billing_cycle="${plan.billing_cycle}", which has no PayPal recurring interval — only monthly/yearly plans can be synced to PayPal.`); e.status = 400; throw e; }
  if (!(Number(plan.price) > 0)) { const e = new Error(`Plan "${plan.name}" has no positive price — free/trial plans are never synced to PayPal.`); e.status = 400; throw e; }

  const billingCycles = [];
  let sequence = 1;
  if (plan.trial_days && Number(plan.trial_days) > 0) {
    billingCycles.push({
      frequency: { interval_unit: "DAY", interval_count: 1 },
      tenure_type: "TRIAL",
      sequence: sequence++,
      total_cycles: Number(plan.trial_days),
      pricing_scheme: { fixed_price: { value: "0", currency_code: plan.currency } },
    });
  }
  billingCycles.push({
    frequency: { interval_unit: interval, interval_count: 1 },
    tenure_type: "REGULAR",
    sequence: sequence++,
    total_cycles: 0, // 0 = indefinite, until cancelled
    pricing_scheme: { fixed_price: { value: Number(plan.price).toFixed(2), currency_code: plan.currency } },
  });

  const { data } = await paypalFetch("/v1/billing/plans", {
    method: "POST",
    idempotencyKey: `billing-plan-${plan.id}-${Date.now()}`,
    body: {
      product_id: paypalProductId,
      name: plan.name,
      description: (plan.description || `${plan.name} — ${plan.billing_cycle}`).slice(0, 127),
      status: "ACTIVE",
      billing_cycles: billingCycles,
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    },
  });
  return data.id; // P-XXXX
}

/** Creates a real PayPal subscription the payer must approve. `returnUrl`/
 * `cancelUrl` are where PayPal redirects the browser after approval —
 * neither of those pages may treat their own load as proof of payment;
 * that's what server-side verification (verifyAndGetSubscription) + the
 * webhook are for. */
export async function createPayPalSubscription({ paypalPlanId, subscriberEmail, subscriberName, returnUrl, cancelUrl, customId }) {
  const { data } = await paypalFetch("/v1/billing/subscriptions", {
    method: "POST",
    idempotencyKey: `sub-${customId}-${Date.now()}`,
    body: {
      plan_id: paypalPlanId,
      custom_id: String(customId), // round-trips through PayPal — our own companyId/subscriptionId reference
      subscriber: subscriberEmail ? { email_address: subscriberEmail, name: subscriberName ? { given_name: subscriberName } : undefined } : undefined,
      application_context: {
        brand_name: "KaizenBMS Platform",
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    },
  });
  const approveLink = data.links?.find((l) => l.rel === "approve")?.href || null;
  return { paypalSubscriptionId: data.id, status: data.status, approveUrl: approveLink };
}

/** The ONLY function allowed to be treated as proof a subscription is real
 * — always fetches fresh from PayPal, never trusts a query-string param or
 * a cached value. Callers (return-URL handler, webhook handler) must call
 * this before writing "active" anywhere. */
export async function getPayPalSubscription(paypalSubscriptionId) {
  const { data } = await paypalFetch(`/v1/billing/subscriptions/${encodeURIComponent(paypalSubscriptionId)}`);
  return data;
}

export async function cancelPayPalSubscription(paypalSubscriptionId, reason = "Cancelled by customer") {
  await paypalFetch(`/v1/billing/subscriptions/${encodeURIComponent(paypalSubscriptionId)}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

export async function suspendPayPalSubscription(paypalSubscriptionId, reason = "Suspended") {
  await paypalFetch(`/v1/billing/subscriptions/${encodeURIComponent(paypalSubscriptionId)}/suspend`, {
    method: "POST",
    body: { reason },
  });
}

export async function activatePayPalSubscription(paypalSubscriptionId, reason = "Reactivated by customer") {
  await paypalFetch(`/v1/billing/subscriptions/${encodeURIComponent(paypalSubscriptionId)}/activate`, {
    method: "POST",
    body: { reason },
  });
}

/**
 * Server-side webhook signature verification via PayPal's own verification
 * endpoint (the officially documented mechanism) — never trusts the posted
 * JSON on its own. `headers` must be the raw incoming request headers;
 * `webhookEvent` is the parsed JSON body PayPal posted.
 */
export async function verifyPayPalWebhookSignature(headers, webhookEvent) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) { const e = new Error("PAYPAL_WEBHOOK_ID is not configured — cannot verify webhook signatures."); e.status = 503; throw e; }

  const { data } = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_time: headers.get("paypal-transmission-time"),
      cert_url: headers.get("paypal-cert-url"),
      auth_algo: headers.get("paypal-auth-algo"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    },
  });
  return data.verification_status === "SUCCESS";
}

export { isPayPalConfigured };
