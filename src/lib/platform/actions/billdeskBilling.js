import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { syncCompanyModulesToPlan, getSubscriptionForCompany } from "@/lib/platform/actions/subscriptions";
import { createBillDeskCheckout, verifyBillDeskTransaction } from "@/lib/payments/billdeskClient";
import { sendSubscriptionReceiptEmail, sendSubscriptionPaymentFailedEmail } from "@/lib/helpers/email";
import { hasSubscriptionBillingSchema } from "@/lib/db/schemaFlags";
import {
  assertBillingSchemaReady, recordSubscriptionPayment,
  beginWebhookEvent, markWebhookEventProcessed, markWebhookEventFailed,
} from "@/lib/platform/actions/subscriptionBilling";

/**
 * BillDesk billing — the single gateway for company subscriptions. Shaped
 * exactly like the retired paypalBilling.js/razorpayBilling.js modules
 * (same checkout → pending-record → verify → activate → webhook pipeline,
 * same gateway-agnostic tables), so `company_subscriptions`/
 * `subscription_payments`/`payment_webhook_events` needed no schema rewrite,
 * only `gateway='billdesk'` rows.
 *
 * The actual HTTP calls to BillDesk live in billdeskClient.js and are not
 * implemented yet (see that file) — every function here is real and wired
 * up around that boundary, so completing billdeskClient.js is the only step
 * left once BillDesk's spec + credentials are available.
 */

// ---------------------------------------------------------------------------
// Company: start a checkout, confirm activation
// ---------------------------------------------------------------------------

/**
 * Session-independent core — also used by the public registration flow
 * (registerCompany), where there's no logged-in session yet, only a
 * just-created companyId. Creates/updates the company's
 * `company_subscriptions` row to status='pending', gateway='billdesk' BEFORE
 * the user completes anything on BillDesk's side — this is a placeholder
 * record, not proof of payment; only confirmCompanySubscriptionFromBillDesk
 * (fed by verified BillDesk data) ever flips it to 'active'.
 */
export async function createBillDeskCheckoutForCompany({ companyId, planId, subscriberEmail, subscriberName, returnUrl, actorId = null }) {
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ? AND status = 'active'`, [planId]);
  if (!plan) { const e = new Error("Plan not found or inactive."); e.status = 404; throw e; }
  if (!(Number(plan.price) > 0)) { const e = new Error("This plan is free — no payment needed. Use the plan-change flow instead."); e.status = 400; throw e; }

  const existing = await getSubscriptionForCompany(companyId);

  // The server calculates the payable amount from the plan row — a client
  // can never influence what gets charged. orderReference ties the eventual
  // BillDesk transaction back to this specific checkout attempt.
  const orderReference = `sub-${companyId}-${Date.now()}`;
  const { checkoutUrl, gatewayOrderId } = await createBillDeskCheckout({
    companyId, planId, amount: plan.price, currency: plan.currency,
    customerEmail: subscriberEmail, customerName: subscriberName, returnUrl, orderReference,
  });

  if (existing) {
    await pool.query(
      `UPDATE company_subscriptions SET plan_id=?, gateway='billdesk', gateway_subscription_id=?, status='pending' WHERE id=?`,
      [planId, gatewayOrderId, existing.id]
    );
  } else {
    await pool.query(
      `INSERT INTO company_subscriptions (company_id, plan_id, gateway, gateway_subscription_id, status, starts_at) VALUES (?,?,?,?,?,CURDATE())`,
      [companyId, planId, "billdesk", gatewayOrderId, "pending"]
    );
  }

  await logActivity({ userId: actorId, module: "platform", action: "billdesk_checkout_started", entityType: "company_subscription", entityId: companyId, companyId, description: `Started BillDesk checkout for plan "${plan.name}"` }).catch(() => {});
  return { checkoutUrl, gatewayOrderId };
}

/** Existing-company entry point — never accepts a companyId from the
 * client, always session.company_id, and requires Company Super Admin. */
export async function startCompanyBillDeskCheckout(session, planId, { returnUrl }) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can change the subscription plan."); e.status = 403; throw e; }
  return createBillDeskCheckoutForCompany({
    companyId: session.company_id, planId, subscriberEmail: session.email, subscriberName: session.name, returnUrl, actorId: session.id,
  });
}

/**
 * The ONLY function that ever flips a BillDesk-backed subscription to
 * 'active'. Always re-verifies with BillDesk itself (via
 * verifyBillDeskTransaction) — never trusts a browser redirect's query
 * params as proof of payment. Called from both the return-URL confirmation
 * page and the webhook handler; safe to call twice for the same order.
 */
export async function confirmCompanySubscriptionFromBillDesk(gatewayOrderId) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();

  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='billdesk' AND gateway_subscription_id = ? LIMIT 1`, [gatewayOrderId]);
  if (!row) { const e = new Error(`No local subscription record for BillDesk order ${gatewayOrderId}.`); e.status = 404; throw e; }

  // verifyBillDeskTransaction is the not-yet-implemented boundary — it will
  // throw BillDeskNotImplementedError until billdeskClient.js is completed.
  // Nothing below this line ever runs on unverified data.
  const transaction = await verifyBillDeskTransaction(gatewayOrderId);
  const mappedStatus = transaction.status; // expected: "active" | "pending" | "failed" | "cancelled" | "expired"

  const wasAlreadyActive = row.status === "active";

  await pool.query(
    `UPDATE company_subscriptions SET status=?, gateway_customer_id=?, next_billing_at=? WHERE id=?`,
    [mappedStatus, transaction.customerId || null, transaction.nextBillingAt || null, row.id]
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
      await notifyPlatformOperators(row.company_id, plan?.name);
      await logActivity({ userId: null, module: "platform", action: "billdesk_subscription_activated", entityType: "company_subscription", entityId: row.id, companyId: row.company_id, description: `BillDesk order ${gatewayOrderId} activated` }).catch(() => {});
    }
  }

  return { status: mappedStatus, companyId: row.company_id, subscriptionId: row.id };
}

async function notifyPlatformOperators(companyId, planName) {
  const [[company]] = await pool.query(`SELECT name FROM companies WHERE id=?`, [companyId]);
  const [operators] = await pool.query(`SELECT id, company_id FROM users WHERE is_platform_operator=1 AND is_deleted=0`);
  for (const op of operators) {
    await createNotification(op.company_id, op.id, {
      title: "New company subscription", message: `${company?.name} subscribed to "${planName}" via BillDesk.`, type: "subscription_activated", link: `/platform/subscriptions`,
    }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Webhook event handlers
// ---------------------------------------------------------------------------

async function handlePaymentFailed(gatewayOrderId, reason) {
  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='billdesk' AND gateway_subscription_id = ? LIMIT 1`, [gatewayOrderId]);
  if (!row) return;
  await pool.query(`UPDATE company_subscriptions SET status='past_due' WHERE id=?`, [row.id]);

  const [[plan]] = await pool.query(`SELECT name FROM plans WHERE id=?`, [row.plan_id]);
  const [admins] = await pool.query(`SELECT id, email FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
  for (const admin of admins) {
    await createNotification(row.company_id, admin.id, {
      title: "Payment failed", message: `Your "${plan?.name}" subscription payment failed. Please retry payment with BillDesk.`, type: "payment_failed", link: `/workspace/settings/subscription`,
    }).catch(() => {});
    if (admin.email) await sendSubscriptionPaymentFailedEmail({ to: admin.email, companyId: row.company_id, planName: plan?.name || "your plan" }).catch(() => {});
  }
  await recordSubscriptionPayment({
    companyId: row.company_id, subscriptionId: row.id, planId: row.plan_id, gateway: "billdesk",
    amount: 0, currency: "INR", gatewayTransactionId: gatewayOrderId, status: "failed",
  }).catch(() => {});
  if (reason) await pool.query(`UPDATE subscription_payments SET failure_reason=? WHERE gateway='billdesk' AND gateway_transaction_id=? ORDER BY id DESC LIMIT 1`, [String(reason).slice(0, 255), gatewayOrderId]).catch(() => {});
}

async function handlePaymentCompleted(gatewayOrderId, amount, currency) {
  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='billdesk' AND gateway_subscription_id = ? LIMIT 1`, [gatewayOrderId]);
  if (!row) return;

  await recordSubscriptionPayment({
    companyId: row.company_id, subscriptionId: row.id, planId: row.plan_id, gateway: "billdesk",
    amount: amount || "0.00", currency: currency || "INR",
    gatewayTransactionId: gatewayOrderId, gatewaySubscriptionId: gatewayOrderId, status: "completed",
  });

  // A completed payment is also strong evidence the subscription is active
  // — sync it in case a separate "activated" event was missed/delayed.
  await confirmCompanySubscriptionFromBillDesk(gatewayOrderId).catch(() => {});

  const [[plan]] = await pool.query(`SELECT name, billing_cycle FROM plans WHERE id=?`, [row.plan_id]);
  const [admins] = await pool.query(`SELECT email FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
  for (const admin of admins) {
    if (admin.email) {
      await sendSubscriptionReceiptEmail({
        to: admin.email, companyId: row.company_id, planName: plan?.name || "Plan",
        amount: amount || "0.00", currency: currency || "INR",
        billingCycle: plan?.billing_cycle || "", gatewayName: "BillDesk", gatewayTransactionId: gatewayOrderId, gatewaySubscriptionId: gatewayOrderId,
      }).catch(() => {});
    }
  }
}

async function handleRefund(gatewayOrderId) {
  await pool.query(`UPDATE subscription_payments SET status='refunded' WHERE gateway='billdesk' AND gateway_transaction_id=?`, [gatewayOrderId]);
}

/**
 * Processes one verified BillDesk webhook event through the shared
 * gateway-agnostic idempotency ledger. The event-type switch below is
 * intentionally generic (paymentStatus in {"success","pending","failed","cancelled","refunded"})
 * rather than named after BillDesk's real event-type strings, since those
 * aren't known yet — the webhook ROUTE (see api/webhooks/billdesk) is the
 * layer that will translate BillDesk's actual payload shape into this call
 * once the spec is available.
 */
export async function processBillDeskWebhookEvent({ eventId, eventType, gatewayOrderId, paymentStatus, amount, currency, failureReason, rawPayload }) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  const { alreadyProcessed } = await beginWebhookEvent({ gateway: "billdesk", eventId, eventType, resourceType: "transaction", rawPayload });
  if (alreadyProcessed) return { alreadyProcessed: true };

  try {
    switch (paymentStatus) {
      case "success":
        await handlePaymentCompleted(gatewayOrderId, amount, currency);
        break;
      case "failed":
        await handlePaymentFailed(gatewayOrderId, failureReason);
        break;
      case "refunded":
        await handleRefund(gatewayOrderId);
        break;
      case "pending":
      case "cancelled":
      default:
        break; // ledger row already records it for audit
    }
    await markWebhookEventProcessed("billdesk", eventId);
  } catch (err) {
    await markWebhookEventFailed("billdesk", eventId, err.message);
    throw err;
  }
  return { alreadyProcessed: false };
}

export { notifyPlatformOperators };
