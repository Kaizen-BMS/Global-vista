import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { syncCompanyModulesToPlan, getSubscriptionForCompany } from "@/lib/platform/actions/subscriptions";
import { createPayPalProduct, createPayPalBillingPlan, createPayPalSubscription, getPayPalSubscription } from "@/lib/payments/paypalSubscriptions";
import { sendSubscriptionReceiptEmail, sendSubscriptionPaymentFailedEmail } from "@/lib/helpers/email";
import { hasSubscriptionBillingSchema, hasPlanPayPalColumns } from "@/lib/db/schemaFlags";
import {
  assertBillingSchemaReady, recordSubscriptionPayment,
  beginWebhookEvent, markWebhookEventProcessed, markWebhookEventFailed,
} from "@/lib/platform/actions/subscriptionBilling";

// PayPal's subscription statuses, mapped to our (wider, gateway-agnostic)
// company_subscriptions state machine.
const PAYPAL_STATUS_MAP = {
  APPROVAL_PENDING: "pending",
  APPROVED: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

// ---------------------------------------------------------------------------
// Platform Operator: sync a CRM plan to a real PayPal Product + Billing Plan
// ---------------------------------------------------------------------------

/** Idempotent by design — reuses paypal_product_id/paypal_plan_id if either
 * already exists on the plan row, never creates a duplicate PayPal object
 * for a plan that's already synced. */
export async function syncPlanToPayPal(planId, operatorId) {
  if (!(await hasPlanPayPalColumns())) assertBillingSchemaReady();
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ?`, [planId]);
  if (!plan) { const e = new Error("Plan not found."); e.status = 404; throw e; }

  let productId = plan.paypal_product_id;
  if (!productId) {
    productId = await createPayPalProduct(plan);
    await pool.query(`UPDATE plans SET paypal_product_id = ? WHERE id = ?`, [productId, planId]);
  }

  let billingPlanId = plan.paypal_plan_id;
  if (!billingPlanId) {
    billingPlanId = await createPayPalBillingPlan({ ...plan, paypal_product_id: productId }, productId);
    await pool.query(`UPDATE plans SET paypal_plan_id = ? WHERE id = ?`, [billingPlanId, planId]);
  }

  await logActivity({ userId: operatorId, module: "platform", action: "plan_synced_to_paypal", entityType: "plan", entityId: planId, description: `Synced plan "${plan.name}" to PayPal (product=${productId}, plan=${billingPlanId})` }).catch(() => {});
  return { paypalProductId: productId, paypalPlanId: billingPlanId };
}

// ---------------------------------------------------------------------------
// Company: start a checkout, confirm activation
// ---------------------------------------------------------------------------

/**
 * The session-independent core — also used by the public registration flow
 * (registerCompany), where there's no logged-in session yet, only a
 * just-created companyId. Creates/updates the company's
 * `company_subscriptions` row to status='pending', gateway='paypal' with
 * the PayPal subscription id BEFORE the user ever approves anything on
 * PayPal's side — this is a placeholder record, not proof of payment; only
 * confirmCompanySubscriptionFromPayPal (fed by verified PayPal data) ever
 * flips it to 'active'.
 */
export async function createPayPalCheckoutForCompany({ companyId, planId, subscriberEmail, subscriberName, returnUrl, cancelUrl, actorId = null }) {
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ? AND status = 'active'`, [planId]);
  if (!plan) { const e = new Error("Plan not found or inactive."); e.status = 404; throw e; }
  if (!(Number(plan.price) > 0)) { const e = new Error("This plan is free — no payment needed. Use the plan-change flow instead."); e.status = 400; throw e; }
  if (!plan.paypal_plan_id) { const e = new Error("This plan hasn't been connected to PayPal yet. Please contact the platform team."); e.status = 400; throw e; }

  const existing = await getSubscriptionForCompany(companyId);

  const { paypalSubscriptionId, approveUrl } = await createPayPalSubscription({
    paypalPlanId: plan.paypal_plan_id,
    subscriberEmail,
    subscriberName,
    returnUrl,
    cancelUrl,
    customId: `company:${companyId}`,
  });
  if (!approveUrl) { const e = new Error("PayPal did not return an approval link."); e.status = 502; throw e; }

  if (existing) {
    await pool.query(
      `UPDATE company_subscriptions SET plan_id=?, gateway='paypal', gateway_subscription_id=?, status='pending' WHERE id=?`,
      [planId, paypalSubscriptionId, existing.id]
    );
  } else {
    await pool.query(
      `INSERT INTO company_subscriptions (company_id, plan_id, gateway, gateway_subscription_id, status, starts_at) VALUES (?,?,?,?,?,CURDATE())`,
      [companyId, planId, "paypal", paypalSubscriptionId, "pending"]
    );
  }

  await logActivity({ userId: actorId, module: "platform", action: "paypal_checkout_started", entityType: "company_subscription", entityId: companyId, companyId, description: `Started PayPal checkout for plan "${plan.name}"` }).catch(() => {});
  return { approveUrl, paypalSubscriptionId };
}

/** Existing-company entry point — never accepts a companyId from the
 * client, always session.company_id, and requires Company Super Admin. */
export async function startCompanyPayPalCheckout(session, planId, { returnUrl, cancelUrl }) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can change the subscription plan."); e.status = 403; throw e; }
  return createPayPalCheckoutForCompany({
    companyId: session.company_id, planId, subscriberEmail: session.email, subscriberName: session.name, returnUrl, cancelUrl, actorId: session.id,
  });
}

/**
 * The ONLY function that ever flips a PayPal-backed subscription to
 * 'active'. Always re-fetches the subscription from PayPal itself — never
 * trusts the `subscription_id` query param a browser redirect carries on
 * its own. Called from both the return-URL confirmation page and the
 * webhook handler; safe to call twice for the same subscription.
 */
export async function confirmCompanySubscriptionFromPayPal(paypalSubscriptionId) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  const paypalSub = await getPayPalSubscription(paypalSubscriptionId);
  const mappedStatus = PAYPAL_STATUS_MAP[paypalSub.status] || "pending";

  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='paypal' AND gateway_subscription_id = ? LIMIT 1`, [paypalSubscriptionId]);
  if (!row) { const e = new Error(`No local subscription record for PayPal subscription ${paypalSubscriptionId}.`); e.status = 404; throw e; }

  const wasAlreadyActive = row.status === "active";
  const nextBillingAt = paypalSub.billing_info?.next_billing_time ? paypalSub.billing_info.next_billing_time.slice(0, 10) : null;

  await pool.query(
    `UPDATE company_subscriptions SET status=?, gateway_customer_id=?, gateway_customer_email=?, next_billing_at=? WHERE id=?`,
    [mappedStatus, paypalSub.subscriber?.payer_id || null, paypalSub.subscriber?.email_address || null, nextBillingAt, row.id]
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
      await notifyPlatformOperators(row.company_id, plan?.name, "paypal");
      await logActivity({ userId: null, module: "platform", action: "paypal_subscription_activated", entityType: "company_subscription", entityId: row.id, companyId: row.company_id, description: `PayPal subscription ${paypalSubscriptionId} activated` }).catch(() => {});
    }
  }

  return { status: mappedStatus, companyId: row.company_id, subscriptionId: row.id };
}

async function notifyPlatformOperators(companyId, planName, gateway) {
  const [[company]] = await pool.query(`SELECT name FROM companies WHERE id=?`, [companyId]);
  const [operators] = await pool.query(`SELECT id, company_id FROM users WHERE is_platform_operator=1 AND is_deleted=0`);
  for (const op of operators) {
    await createNotification(op.company_id, op.id, {
      title: "New company subscription", message: `${company?.name} subscribed to "${planName}" via ${gateway}.`, type: "subscription_activated", link: `/platform/subscriptions`,
    }).catch(() => {});
  }
}

async function handlePaymentFailed(resource) {
  const gatewaySubscriptionId = resource.id;
  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='paypal' AND gateway_subscription_id = ? LIMIT 1`, [gatewaySubscriptionId]);
  if (!row) return;
  await pool.query(`UPDATE company_subscriptions SET status='past_due' WHERE id=?`, [row.id]);

  const [[plan]] = await pool.query(`SELECT name FROM plans WHERE id=?`, [row.plan_id]);
  const [admins] = await pool.query(`SELECT id, email FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
  for (const admin of admins) {
    await createNotification(row.company_id, admin.id, {
      title: "Payment failed", message: `Your "${plan?.name}" subscription payment failed. Please update your payment method with PayPal.`, type: "payment_failed", link: `/workspace/settings/subscription`,
    }).catch(() => {});
    if (admin.email) await sendSubscriptionPaymentFailedEmail({ to: admin.email, companyId: row.company_id, planName: plan?.name || "your plan" }).catch(() => {});
  }
}

async function handlePaymentCompleted(resource) {
  // For subscription billing, PAYMENT.SALE.COMPLETED carries the
  // subscription id in billing_agreement_id.
  const gatewaySubscriptionId = resource.billing_agreement_id;
  if (!gatewaySubscriptionId) return; // a one-off sale unrelated to a subscription — nothing for this module to record
  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='paypal' AND gateway_subscription_id = ? LIMIT 1`, [gatewaySubscriptionId]);
  if (!row) return;

  await recordSubscriptionPayment({
    companyId: row.company_id, subscriptionId: row.id, planId: row.plan_id, gateway: "paypal",
    amount: resource.amount?.total || "0.00", currency: resource.amount?.currency || "USD",
    gatewayTransactionId: resource.id, gatewaySubscriptionId, status: "completed",
  });

  // A completed payment is also strong evidence the subscription is active
  // — sync it in case the ACTIVATED webhook was missed/delayed.
  await confirmCompanySubscriptionFromPayPal(gatewaySubscriptionId).catch(() => {});

  const [[plan]] = await pool.query(`SELECT name, billing_cycle FROM plans WHERE id=?`, [row.plan_id]);
  const [admins] = await pool.query(`SELECT email FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
  for (const admin of admins) {
    if (admin.email) {
      await sendSubscriptionReceiptEmail({
        to: admin.email, companyId: row.company_id, planName: plan?.name || "Plan",
        amount: resource.amount?.total || "0.00", currency: resource.amount?.currency || "USD",
        billingCycle: plan?.billing_cycle || "", paypalTransactionId: resource.id, paypalSubscriptionId: gatewaySubscriptionId,
      }).catch(() => {});
    }
  }
}

async function handlePaymentRefundOrReversal(resource, status) {
  const originalTransactionId = resource.sale_id || resource.id;
  if (!originalTransactionId) return;
  await pool.query(`UPDATE subscription_payments SET status=? WHERE gateway='paypal' AND gateway_transaction_id=?`, [status, originalTransactionId]);
}

export async function processPayPalWebhookEvent({ eventId, eventType, resourceType, resource, rawPayload }) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  const { alreadyProcessed } = await beginWebhookEvent({ gateway: "paypal", eventId, eventType, resourceType, rawPayload });
  if (alreadyProcessed) return { alreadyProcessed: true };

  try {
    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.UPDATED":
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
        await confirmCompanySubscriptionFromPayPal(resource.id);
        break;
      case "BILLING.SUBSCRIPTION.CREATED":
        break; // logged to the ledger above; nothing to activate until approval
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
        await handlePaymentFailed(resource);
        break;
      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(resource);
        break;
      case "PAYMENT.SALE.REFUNDED":
        await handlePaymentRefundOrReversal(resource, "refunded");
        break;
      case "PAYMENT.SALE.REVERSED":
        await handlePaymentRefundOrReversal(resource, "reversed");
        break;
      default:
        break; // unrecognized event type — ledger row already records it for audit
    }
    await markWebhookEventProcessed("paypal", eventId);
  } catch (err) {
    await markWebhookEventFailed("paypal", eventId, err.message);
    throw err;
  }
  return { alreadyProcessed: false };
}

export { PAYPAL_STATUS_MAP, notifyPlatformOperators };
