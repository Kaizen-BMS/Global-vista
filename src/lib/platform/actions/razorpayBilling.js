import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { syncCompanyModulesToPlan, getSubscriptionForCompany } from "@/lib/platform/actions/subscriptions";
import { createRazorpayPlan, createRazorpaySubscription, getRazorpaySubscription, verifyRazorpaySubscriptionSignature } from "@/lib/payments/razorpaySubscriptions";
import { sendSubscriptionReceiptEmail, sendSubscriptionPaymentFailedEmail } from "@/lib/helpers/email";
import { hasSubscriptionBillingSchema, hasPlanRazorpayColumns } from "@/lib/db/schemaFlags";
import {
  assertBillingSchemaReady, recordSubscriptionPayment,
  beginWebhookEvent, markWebhookEventProcessed, markWebhookEventFailed,
} from "@/lib/platform/actions/subscriptionBilling";
import { notifyPlatformOperators } from "@/lib/platform/actions/paypalBilling";

// Razorpay's subscription statuses, mapped to our (wider, gateway-agnostic)
// company_subscriptions state machine.
const RAZORPAY_STATUS_MAP = {
  created: "pending",
  authenticated: "pending",
  active: "active",
  pending: "past_due",
  halted: "past_due",
  paused: "suspended",
  cancelled: "cancelled",
  completed: "expired",
  expired: "expired",
};

// ---------------------------------------------------------------------------
// Platform Operator: sync a CRM plan to a real Razorpay Plan
// ---------------------------------------------------------------------------

/** Idempotent by design — reuses razorpay_plan_id if it already exists on
 * the plan row, never creates a duplicate Razorpay plan for a plan that's
 * already synced. */
export async function syncPlanToRazorpay(planId, operatorId) {
  if (!(await hasPlanRazorpayColumns())) assertBillingSchemaReady();
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ?`, [planId]);
  if (!plan) { const e = new Error("Plan not found."); e.status = 404; throw e; }

  let razorpayPlanId = plan.razorpay_plan_id;
  if (!razorpayPlanId) {
    razorpayPlanId = await createRazorpayPlan(plan);
    await pool.query(`UPDATE plans SET razorpay_plan_id = ? WHERE id = ?`, [razorpayPlanId, planId]);
  }

  await logActivity({ userId: operatorId, module: "platform", action: "plan_synced_to_razorpay", entityType: "plan", entityId: planId, description: `Synced plan "${plan.name}" to Razorpay (plan=${razorpayPlanId})` }).catch(() => {});
  return { razorpayPlanId };
}

// ---------------------------------------------------------------------------
// Company: create a subscription for Razorpay Checkout to open, then verify
// ---------------------------------------------------------------------------

/**
 * Creates a Razorpay subscription and returns the id + the PUBLIC key_id
 * (never the secret) for the browser to open Razorpay Checkout with. This
 * is a placeholder record (status='pending') — only
 * verifyAndConfirmRazorpaySubscription (fed by a signature-verified
 * checkout callback or the webhook) ever flips it to 'active'.
 */
export async function createRazorpayCheckoutForCompany({ companyId, planId, subscriberEmail, subscriberName, actorId = null }) {
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ? AND status = 'active'`, [planId]);
  if (!plan) { const e = new Error("Plan not found or inactive."); e.status = 404; throw e; }
  if (!(Number(plan.price) > 0)) { const e = new Error("This plan is free — no payment needed. Use the plan-change flow instead."); e.status = 400; throw e; }
  if (!plan.razorpay_plan_id) { const e = new Error("This plan hasn't been connected to Razorpay yet. Please contact the platform team."); e.status = 400; throw e; }

  const existing = await getSubscriptionForCompany(companyId);

  const { razorpaySubscriptionId } = await createRazorpaySubscription({
    razorpayPlanId: plan.razorpay_plan_id,
    billingCycle: plan.billing_cycle,
    customerEmail: subscriberEmail,
    customerName: subscriberName,
    customId: `company:${companyId}`,
  });

  if (existing) {
    await pool.query(
      `UPDATE company_subscriptions SET plan_id=?, gateway='razorpay', gateway_subscription_id=?, status='pending' WHERE id=?`,
      [planId, razorpaySubscriptionId, existing.id]
    );
  } else {
    await pool.query(
      `INSERT INTO company_subscriptions (company_id, plan_id, gateway, gateway_subscription_id, status, starts_at) VALUES (?,?,?,?,?,CURDATE())`,
      [companyId, planId, "razorpay", razorpaySubscriptionId, "pending"]
    );
  }

  await logActivity({ userId: actorId, module: "platform", action: "razorpay_checkout_started", entityType: "company_subscription", entityId: companyId, companyId, description: `Started Razorpay checkout for plan "${plan.name}"` }).catch(() => {});
  return { razorpaySubscriptionId, razorpayKeyId: process.env.RAZORPAY_KEY_ID, planName: plan.name, amount: plan.price, currency: plan.currency };
}

export async function startCompanyRazorpayCheckout(session, planId) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can change the subscription plan."); e.status = 403; throw e; }
  return createRazorpayCheckoutForCompany({ companyId: session.company_id, planId, subscriberEmail: session.email, subscriberName: session.name, actorId: session.id });
}

/**
 * The ONLY function that ever flips a Razorpay-backed subscription to
 * 'active' from the checkout-callback path. First verifies the HMAC
 * signature Razorpay's JS SDK returned to the browser (proves the payment
 * really happened — a forged callback can never produce a valid signature
 * without the secret), THEN re-fetches the subscription from Razorpay
 * itself before writing anything. Never trusts the browser's "success"
 * callback on its own.
 */
export async function verifyAndConfirmRazorpaySubscription({ session, razorpaySubscriptionId, razorpayPaymentId, razorpaySignature }) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();

  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='razorpay' AND gateway_subscription_id = ? AND company_id = ? LIMIT 1`, [razorpaySubscriptionId, session.company_id]);
  if (!row) { const e = new Error("No matching subscription found for this company."); e.status = 404; throw e; }

  const validSignature = verifyRazorpaySubscriptionSignature({ paymentId: razorpayPaymentId, subscriptionId: razorpaySubscriptionId, signature: razorpaySignature });
  if (!validSignature) { const e = new Error("Payment verification failed. Please contact support."); e.status = 400; throw e; }

  return confirmRazorpaySubscription(razorpaySubscriptionId);
}

/**
 * Public registration variant — there's no session yet at the moment
 * Razorpay Checkout's callback fires during signup (the admin account
 * exists but hasn't logged in), so this can't scope by session.company_id
 * the way verifyAndConfirmRazorpaySubscription does. The signature check is
 * what actually proves authenticity here (a forged callback can't produce
 * a valid HMAC without the webhook/checkout secret) — same trust boundary
 * confirmCompanySubscriptionFromPayPal already relies on for PayPal's
 * session-less register/confirm path.
 */
export async function verifyAndConfirmRazorpaySubscriptionPublic({ razorpaySubscriptionId, razorpayPaymentId, razorpaySignature }) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  const validSignature = verifyRazorpaySubscriptionSignature({ paymentId: razorpayPaymentId, subscriptionId: razorpaySubscriptionId, signature: razorpaySignature });
  if (!validSignature) { const e = new Error("Payment verification failed. Please contact support."); e.status = 400; throw e; }
  return confirmRazorpaySubscription(razorpaySubscriptionId);
}

/** Gateway-of-truth confirmation, shared by the checkout-callback path
 * (after signature verification) and the webhook handler. Always re-fetches
 * from Razorpay before writing anything — safe to call twice. */
export async function confirmRazorpaySubscription(razorpaySubscriptionId) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  const rzpSub = await getRazorpaySubscription(razorpaySubscriptionId);
  const mappedStatus = RAZORPAY_STATUS_MAP[rzpSub.status] || "pending";

  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='razorpay' AND gateway_subscription_id = ? LIMIT 1`, [razorpaySubscriptionId]);
  if (!row) { const e = new Error(`No local subscription record for Razorpay subscription ${razorpaySubscriptionId}.`); e.status = 404; throw e; }

  const wasAlreadyActive = row.status === "active";
  const nextBillingAt = rzpSub.charge_at ? new Date(rzpSub.charge_at * 1000).toISOString().slice(0, 10) : null;

  await pool.query(
    `UPDATE company_subscriptions SET status=?, gateway_customer_id=?, next_billing_at=? WHERE id=?`,
    [mappedStatus, rzpSub.customer_id || null, nextBillingAt, row.id]
  );

  if (mappedStatus === "active") {
    const conn = await pool.getConnection();
    try {
      await syncCompanyModulesToPlan(conn, row.company_id, row.plan_id, null);
    } finally {
      conn.release();
    }
    if (!wasAlreadyActive) {
      const [[plan]] = await pool.query(`SELECT name FROM plans WHERE id=?`, [row.plan_id]);
      const [admins] = await pool.query(`SELECT id FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
      for (const admin of admins) {
        await createNotification(row.company_id, admin.id, {
          title: "Subscription activated", message: `Your "${plan?.name}" subscription is now active.`, type: "subscription_activated", link: `/workspace/settings/subscription`,
        }).catch(() => {});
      }
      await notifyPlatformOperators(row.company_id, plan?.name, "razorpay");
      await logActivity({ userId: null, module: "platform", action: "razorpay_subscription_activated", entityType: "company_subscription", entityId: row.id, companyId: row.company_id, description: `Razorpay subscription ${razorpaySubscriptionId} activated` }).catch(() => {});
    }
  }

  return { status: mappedStatus, companyId: row.company_id, subscriptionId: row.id };
}

async function handleRazorpayPaymentFailed(payload) {
  const razorpaySubscriptionId = payload.payment?.entity?.subscription_id || payload.subscription?.entity?.id;
  if (!razorpaySubscriptionId) return;
  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='razorpay' AND gateway_subscription_id = ? LIMIT 1`, [razorpaySubscriptionId]);
  if (!row) return;
  await pool.query(`UPDATE company_subscriptions SET status='past_due' WHERE id=?`, [row.id]);

  const [[plan]] = await pool.query(`SELECT name FROM plans WHERE id=?`, [row.plan_id]);
  const [admins] = await pool.query(`SELECT id, email FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
  for (const admin of admins) {
    await createNotification(row.company_id, admin.id, {
      title: "Payment failed", message: `Your "${plan?.name}" subscription payment failed. Please update your payment method with Razorpay.`, type: "payment_failed", link: `/workspace/settings/subscription`,
    }).catch(() => {});
    if (admin.email) await sendSubscriptionPaymentFailedEmail({ to: admin.email, companyId: row.company_id, planName: plan?.name || "your plan" }).catch(() => {});
  }
}

async function handleRazorpayPaymentCaptured(payload) {
  const payment = payload.payment?.entity;
  const razorpaySubscriptionId = payment?.subscription_id;
  if (!razorpaySubscriptionId) return; // a one-off payment unrelated to a subscription — nothing for this module to record
  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='razorpay' AND gateway_subscription_id = ? LIMIT 1`, [razorpaySubscriptionId]);
  if (!row) return;

  await recordSubscriptionPayment({
    companyId: row.company_id, subscriptionId: row.id, planId: row.plan_id, gateway: "razorpay",
    amount: (payment.amount || 0) / 100, currency: payment.currency || "INR",
    gatewayTransactionId: payment.id, gatewayOrderId: payment.order_id || null, gatewaySubscriptionId: razorpaySubscriptionId, status: "completed",
  });

  // A captured payment is also strong evidence the subscription is active
  // — sync it in case the "subscription.activated" webhook was missed/delayed.
  await confirmRazorpaySubscription(razorpaySubscriptionId).catch(() => {});

  const [[plan]] = await pool.query(`SELECT name, billing_cycle FROM plans WHERE id=?`, [row.plan_id]);
  const [admins] = await pool.query(`SELECT email FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
  for (const admin of admins) {
    if (admin.email) {
      await sendSubscriptionReceiptEmail({
        to: admin.email, companyId: row.company_id, planName: plan?.name || "Plan",
        amount: (payment.amount || 0) / 100, currency: payment.currency || "INR",
        billingCycle: plan?.billing_cycle || "", paypalTransactionId: payment.id, paypalSubscriptionId: razorpaySubscriptionId,
      }).catch(() => {});
    }
  }
}

async function handleRazorpayRefund(payload) {
  const refund = payload.refund?.entity;
  const originalTransactionId = refund?.payment_id;
  if (!originalTransactionId) return;
  await pool.query(`UPDATE subscription_payments SET status='refunded' WHERE gateway='razorpay' AND gateway_transaction_id=?`, [originalTransactionId]);
}

export async function processRazorpayWebhookEvent({ eventId, eventType, rawPayload, payload }) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  const { alreadyProcessed } = await beginWebhookEvent({ gateway: "razorpay", eventId, eventType, resourceType: "event", rawPayload });
  if (alreadyProcessed) return { alreadyProcessed: true };

  try {
    switch (eventType) {
      case "subscription.activated":
      case "subscription.charged":
      case "subscription.updated":
      case "subscription.cancelled":
      case "subscription.completed":
      case "subscription.paused":
      case "subscription.resumed":
        if (payload.subscription?.entity?.id) await confirmRazorpaySubscription(payload.subscription.entity.id);
        break;
      case "subscription.pending":
      case "subscription.halted":
        await handleRazorpayPaymentFailed(payload);
        break;
      case "payment.captured":
        await handleRazorpayPaymentCaptured(payload);
        break;
      case "payment.failed":
        await handleRazorpayPaymentFailed(payload);
        break;
      case "refund.processed":
        await handleRazorpayRefund(payload);
        break;
      default:
        break; // unrecognized event type — ledger row already records it for audit
    }
    await markWebhookEventProcessed("razorpay", eventId);
  } catch (err) {
    await markWebhookEventFailed("razorpay", eventId, err.message);
    throw err;
  }
  return { alreadyProcessed: false };
}

export { RAZORPAY_STATUS_MAP };
