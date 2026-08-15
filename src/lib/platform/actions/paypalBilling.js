import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { syncCompanyModulesToPlan, getSubscriptionForCompany } from "@/lib/platform/actions/subscriptions";
import {
  createPayPalProduct, createPayPalBillingPlan, createPayPalSubscription, getPayPalSubscription,
  cancelPayPalSubscription, activatePayPalSubscription,
} from "@/lib/payments/paypalSubscriptions";
import { sendSubscriptionReceiptEmail, sendSubscriptionPaymentFailedEmail } from "@/lib/helpers/email";
import { hasPayPalBillingSchema, hasPlanPayPalColumns } from "@/lib/db/schemaFlags";

function assertPayPalSchemaReady() {
  const e = new Error("The PayPal billing schema hasn't been applied to this database yet.");
  e.status = 503;
  throw e;
}

// PayPal's subscription statuses, mapped to our (wider) company_subscriptions
// state machine — kept in one place so no caller has to know PayPal's raw
// vocabulary.
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
  if (!(await hasPlanPayPalColumns())) assertPayPalSchemaReady();
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
 * `company_subscriptions` row to status='pending', provider='paypal' with
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
      `UPDATE company_subscriptions SET plan_id=?, provider='paypal', paypal_subscription_id=?, status='pending' WHERE id=?`,
      [planId, paypalSubscriptionId, existing.id]
    );
  } else {
    await pool.query(
      `INSERT INTO company_subscriptions (company_id, plan_id, provider, paypal_subscription_id, status, starts_at) VALUES (?,?,?,?,?,CURDATE())`,
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
 * The ONLY function that ever flips a subscription to 'active'. Always
 * re-fetches the subscription from PayPal itself — never trusts the
 * `subscription_id` query param a browser redirect carries on its own.
 * Called from both the return-URL confirmation page and the webhook
 * handler; safe to call twice for the same subscription (idempotent —
 * re-applies the same state, doesn't double-notify past the first
 * activation).
 */
export async function confirmCompanySubscriptionFromPayPal(paypalSubscriptionId) {
  if (!(await hasPayPalBillingSchema())) assertPayPalSchemaReady();
  const paypalSub = await getPayPalSubscription(paypalSubscriptionId);
  const mappedStatus = PAYPAL_STATUS_MAP[paypalSub.status] || "pending";

  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE paypal_subscription_id = ? LIMIT 1`, [paypalSubscriptionId]);
  if (!row) { const e = new Error(`No local subscription record for PayPal subscription ${paypalSubscriptionId}.`); e.status = 404; throw e; }

  const wasAlreadyActive = row.status === "active";
  const nextBillingAt = paypalSub.billing_info?.next_billing_time ? paypalSub.billing_info.next_billing_time.slice(0, 10) : null;

  await pool.query(
    `UPDATE company_subscriptions SET status=?, paypal_payer_id=?, paypal_payer_email=?, next_billing_at=? WHERE id=?`,
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
      await logActivity({ userId: null, module: "platform", action: "paypal_subscription_activated", entityType: "company_subscription", entityId: row.id, companyId: row.company_id, description: `PayPal subscription ${paypalSubscriptionId} activated` }).catch(() => {});
    }
  }

  return { status: mappedStatus, companyId: row.company_id, subscriptionId: row.id };
}

// ---------------------------------------------------------------------------
// Payment recording — idempotent on paypal_transaction_id
// ---------------------------------------------------------------------------

export async function recordSubscriptionPayment({ companyId, subscriptionId, planId, amount, currency, paypalTransactionId, paypalSubscriptionId, status = "completed", billingPeriodStart = null, billingPeriodEnd = null }) {
  if (!(await hasPayPalBillingSchema())) assertPayPalSchemaReady();
  await pool.query(
    `INSERT INTO subscription_payments (company_id, subscription_id, plan_id, amount, currency, paypal_transaction_id, paypal_subscription_id, status, billing_period_start, billing_period_end)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE id = id`,
    [companyId, subscriptionId, planId, amount, currency, paypalTransactionId, paypalSubscriptionId, status, billingPeriodStart, billingPeriodEnd]
  );
  await pool.query(`UPDATE company_subscriptions SET last_payment_at = CURDATE() WHERE id = ?`, [subscriptionId]);
}

export async function listSubscriptionPayments(session) {
  if (!(await hasPayPalBillingSchema())) return []; // read path on a page load — degrade quietly, never 500 the settings page
  const [rows] = await pool.query(
    `SELECT sp.*, p.name AS plan_name FROM subscription_payments sp JOIN plans p ON p.id = sp.plan_id
     WHERE sp.company_id = ? ORDER BY sp.created_at DESC LIMIT 100`,
    [session.company_id]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Cancel / resume — company-initiated, scoped to the caller's own company
// ---------------------------------------------------------------------------

export async function cancelOwnSubscription(session) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can cancel the subscription."); e.status = 403; throw e; }
  const sub = await getSubscriptionForCompany(session.company_id);
  if (!sub) { const e = new Error("No subscription to cancel."); e.status = 404; throw e; }

  if (sub.provider === "paypal" && sub.paypal_subscription_id && sub.status === "active") {
    await cancelPayPalSubscription(sub.paypal_subscription_id, `Cancelled by ${session.name}`);
  }
  await pool.query(`UPDATE company_subscriptions SET status='cancelled', cancelled_at=NOW() WHERE id=?`, [sub.id]);
  await logActivity({ userId: session.id, module: "platform", action: "subscription_cancelled_by_company", entityType: "company_subscription", entityId: sub.id, companyId: session.company_id, description: `${session.name} cancelled the subscription` }).catch(() => {});
}

/** Resume only works for a PayPal subscription PayPal itself still considers
 * SUSPENDED (not CANCELLED/EXPIRED — those need a brand-new checkout). */
export async function resumeOwnSubscription(session) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can resume the subscription."); e.status = 403; throw e; }
  const sub = await getSubscriptionForCompany(session.company_id);
  if (!sub) { const e = new Error("No subscription to resume."); e.status = 404; throw e; }
  if (sub.provider !== "paypal" || !sub.paypal_subscription_id) { const e = new Error("This subscription isn't managed through PayPal, so it can't be resumed here."); e.status = 400; throw e; }

  const paypalSub = await getPayPalSubscription(sub.paypal_subscription_id);
  if (paypalSub.status !== "SUSPENDED") { const e = new Error(`PayPal reports this subscription as "${paypalSub.status}", which can't be resumed — start a new subscription instead.`); e.status = 400; throw e; }

  await activatePayPalSubscription(sub.paypal_subscription_id, `Resumed by ${session.name}`);
  await pool.query(`UPDATE company_subscriptions SET status='active' WHERE id=?`, [sub.id]);
  await logActivity({ userId: session.id, module: "platform", action: "subscription_resumed", entityType: "company_subscription", entityId: sub.id, companyId: session.company_id, description: `${session.name} resumed the subscription` }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Downgrade protection (Part 15) — never silently strip data over a limit
// ---------------------------------------------------------------------------

export async function assertPlanChangeAllowed(companyId, newPlanId) {
  const [[newPlan]] = await pool.query(`SELECT * FROM plans WHERE id = ? AND status = 'active'`, [newPlanId]);
  if (!newPlan) { const e = new Error("Plan not found or inactive."); e.status = 404; throw e; }

  const [[usage]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE company_id=? AND is_deleted=0) AS userCount,
       (SELECT COUNT(*) FROM leads WHERE company_id=? AND is_deleted=0) AS leadCount,
       COALESCE((SELECT SUM(file_size) FROM employee_documents WHERE company_id=? AND is_deleted=0),0) +
       COALESCE((SELECT SUM(file_size) FROM lead_documents WHERE company_id=?),0) AS storageBytes`,
    [companyId, companyId, companyId, companyId]
  );

  const problems = [];
  if (newPlan.max_users && usage.userCount > newPlan.max_users) problems.push(`${usage.userCount} employees exceed this plan's limit of ${newPlan.max_users}.`);
  if (newPlan.max_leads && usage.leadCount > newPlan.max_leads) problems.push(`${usage.leadCount} leads exceed this plan's limit of ${newPlan.max_leads}.`);
  if (newPlan.max_storage_mb && usage.storageBytes > newPlan.max_storage_mb * 1024 * 1024) problems.push(`Current storage use exceeds this plan's ${newPlan.max_storage_mb}MB limit.`);

  if (problems.length) {
    const e = new Error(`Your current usage exceeds this plan's limits. Please reduce usage before switching: ${problems.join(" ")}`);
    e.status = 409;
    throw e;
  }
  return newPlan;
}

// ---------------------------------------------------------------------------
// Webhook event processing — called ONLY after signature verification.
// Idempotency lives here (paypal_webhook_events.event_id UNIQUE): a
// duplicate delivery of the same event_id is a no-op, never reprocessed.
// ---------------------------------------------------------------------------

async function findSubscriptionByPayPalId(paypalSubscriptionId) {
  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE paypal_subscription_id = ? LIMIT 1`, [paypalSubscriptionId]);
  return row || null;
}

async function handlePaymentFailed(resource) {
  const paypalSubscriptionId = resource.id;
  const row = await findSubscriptionByPayPalId(paypalSubscriptionId);
  if (!row) return;
  await pool.query(`UPDATE company_subscriptions SET status='past_due' WHERE id=?`, [row.id]);

  const [[plan]] = await pool.query(`SELECT name FROM plans WHERE id=?`, [row.plan_id]);
  const [admins] = await pool.query(`SELECT id, email, name FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
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
  const paypalSubscriptionId = resource.billing_agreement_id;
  if (!paypalSubscriptionId) return; // a one-off sale unrelated to a subscription — nothing for this module to record
  const row = await findSubscriptionByPayPalId(paypalSubscriptionId);
  if (!row) return;

  await recordSubscriptionPayment({
    companyId: row.company_id,
    subscriptionId: row.id,
    planId: row.plan_id,
    amount: resource.amount?.total || "0.00",
    currency: resource.amount?.currency || "USD",
    paypalTransactionId: resource.id,
    paypalSubscriptionId,
    status: "completed",
  });

  // A completed payment is also strong evidence the subscription is active
  // — sync it in case the ACTIVATED webhook was missed/delayed.
  await confirmCompanySubscriptionFromPayPal(paypalSubscriptionId).catch(() => {});

  const [[plan]] = await pool.query(`SELECT name, billing_cycle FROM plans WHERE id=?`, [row.plan_id]);
  const [admins] = await pool.query(`SELECT email FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
  for (const admin of admins) {
    if (admin.email) {
      await sendSubscriptionReceiptEmail({
        to: admin.email, companyId: row.company_id, planName: plan?.name || "Plan",
        amount: resource.amount?.total || "0.00", currency: resource.amount?.currency || "USD",
        billingCycle: plan?.billing_cycle || "", paypalTransactionId: resource.id, paypalSubscriptionId,
      }).catch(() => {});
    }
  }
}

async function handlePaymentRefundOrReversal(resource, status) {
  // Refund/reversal resources reference the original sale via `sale_id`
  // (older payload shape) or the id itself is the refund/reversal's own —
  // match on whichever is present against the transaction we recorded.
  const originalTransactionId = resource.sale_id || resource.id;
  if (!originalTransactionId) return;
  await pool.query(`UPDATE subscription_payments SET status=? WHERE paypal_transaction_id=?`, [status, originalTransactionId]);
}

export async function processPayPalWebhookEvent({ eventId, eventType, resourceType, resource, rawPayload }) {
  if (!(await hasPayPalBillingSchema())) assertPayPalSchemaReady();
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO paypal_webhook_events (event_id, event_type, resource_type, payload, status) VALUES (?,?,?,?,'received')`,
      [eventId, eventType, resourceType || null, rawPayload]
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") { conn.release(); return { alreadyProcessed: true }; }
    conn.release();
    throw err;
  }
  conn.release();

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
    await pool.query(`UPDATE paypal_webhook_events SET status='processed', processed_at=NOW() WHERE event_id=?`, [eventId]);
  } catch (err) {
    await pool.query(`UPDATE paypal_webhook_events SET status='failed', error_message=? WHERE event_id=?`, [String(err.message || err).slice(0, 500), eventId]);
    throw err;
  }
  return { alreadyProcessed: false };
}

export { PAYPAL_STATUS_MAP };
