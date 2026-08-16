import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { getSubscriptionForCompany } from "@/lib/platform/actions/subscriptions";
import { cancelPayPalSubscription, activatePayPalSubscription, getPayPalSubscription } from "@/lib/payments/paypalSubscriptions";
import { cancelRazorpaySubscription, resumeRazorpaySubscription, getRazorpaySubscription } from "@/lib/payments/razorpaySubscriptions";
import { hasSubscriptionBillingSchema } from "@/lib/db/schemaFlags";

/**
 * Gateway-AGNOSTIC subscription actions — shared by both Razorpay and
 * PayPal so cancel/resume/payment-history/downgrade-protection behave
 * identically regardless of which gateway a given company's subscription
 * happens to be on. Gateway-specific checkout-creation and webhook
 * processing live in paypalBilling.js / razorpayBilling.js, which both
 * import from here (never the other direction — avoids a circular import).
 */

export function assertBillingSchemaReady() {
  const e = new Error("The subscription billing schema hasn't been applied to this database yet.");
  e.status = 503;
  throw e;
}

// ---------------------------------------------------------------------------
// Payment recording — idempotent on (gateway, gateway_transaction_id)
// ---------------------------------------------------------------------------

export async function recordSubscriptionPayment({ companyId, subscriptionId, planId, gateway, amount, currency, gatewayTransactionId, gatewayOrderId = null, gatewaySubscriptionId, status = "completed", billingCycle = null, invoiceReference = null }) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  await pool.query(
    `INSERT INTO subscription_payments (company_id, subscription_id, plan_id, gateway, gateway_transaction_id, gateway_order_id, gateway_subscription_id, amount, currency, status, billing_cycle, invoice_reference, payment_date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURDATE())
     ON DUPLICATE KEY UPDATE id = id`,
    [companyId, subscriptionId, planId, gateway, gatewayTransactionId, gatewayOrderId, gatewaySubscriptionId, amount, currency, status, billingCycle, invoiceReference]
  );
  await pool.query(`UPDATE company_subscriptions SET last_payment_at = CURDATE() WHERE id = ?`, [subscriptionId]);
}

export async function listSubscriptionPayments(session) {
  if (!(await hasSubscriptionBillingSchema())) return []; // read path on a page load — degrade quietly, never 500 the settings page
  const [rows] = await pool.query(
    `SELECT sp.*, p.name AS plan_name FROM subscription_payments sp JOIN plans p ON p.id = sp.plan_id
     WHERE sp.company_id = ? ORDER BY sp.created_at DESC LIMIT 100`,
    [session.company_id]
  );
  return rows;
}

/** Platform-wide billing summary for the Platform Operator dashboard —
 * real numbers from subscription_payments/company_subscriptions, never
 * fabricated. Returns all-zero on a pre-migration environment rather than
 * throwing, since this feeds a page-load tile row. */
export async function getSubscriptionBillingStats() {
  if (!(await hasSubscriptionBillingSchema())) {
    return { revenueByCurrency: [], pendingCount: 0, pastDueCount: 0, failedPaymentsCount: 0, byGateway: [] };
  }
  const [revenueResult, pendingResult, gatewayResult, failedResult] = await Promise.all([
    pool.query(`SELECT currency, SUM(amount) AS total FROM subscription_payments WHERE status='completed' GROUP BY currency`),
    pool.query(`SELECT SUM(status='pending') AS pendingCount, SUM(status='past_due') AS pastDueCount FROM company_subscriptions`),
    pool.query(`SELECT gateway, COUNT(*) AS count FROM company_subscriptions WHERE gateway != 'manual' GROUP BY gateway`),
    pool.query(`SELECT COUNT(*) AS n FROM subscription_payments WHERE status='failed'`),
  ]);
  const pendingRow = pendingResult[0][0];
  const failedRow = failedResult[0][0];
  return {
    revenueByCurrency: revenueResult[0],
    pendingCount: Number(pendingRow?.pendingCount || 0),
    pastDueCount: Number(pendingRow?.pastDueCount || 0),
    failedPaymentsCount: Number(failedRow?.n || 0),
    byGateway: gatewayResult[0],
  };
}

// ---------------------------------------------------------------------------
// Cancel / resume — company-initiated, scoped to the caller's own company,
// dispatches to whichever gateway the subscription is actually on.
// ---------------------------------------------------------------------------

export async function cancelOwnSubscription(session) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can cancel the subscription."); e.status = 403; throw e; }
  const sub = await getSubscriptionForCompany(session.company_id);
  if (!sub) { const e = new Error("No subscription to cancel."); e.status = 404; throw e; }

  if (sub.gateway === "paypal" && sub.gateway_subscription_id && sub.status === "active") {
    await cancelPayPalSubscription(sub.gateway_subscription_id, `Cancelled by ${session.name}`);
  } else if (sub.gateway === "razorpay" && sub.gateway_subscription_id && sub.status === "active") {
    await cancelRazorpaySubscription(sub.gateway_subscription_id);
  }
  await pool.query(`UPDATE company_subscriptions SET status='cancelled', cancelled_at=NOW() WHERE id=?`, [sub.id]);
  await logActivity({ userId: session.id, module: "platform", action: "subscription_cancelled_by_company", entityType: "company_subscription", entityId: sub.id, companyId: session.company_id, description: `${session.name} cancelled the subscription` }).catch(() => {});
}

/** Resume only works for a gateway subscription the gateway itself still
 * considers SUSPENDED/PAUSED (not CANCELLED/EXPIRED — those need a brand-new checkout). */
export async function resumeOwnSubscription(session) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can resume the subscription."); e.status = 403; throw e; }
  const sub = await getSubscriptionForCompany(session.company_id);
  if (!sub) { const e = new Error("No subscription to resume."); e.status = 404; throw e; }
  if (sub.gateway === "manual" || !sub.gateway_subscription_id) { const e = new Error("This subscription isn't managed through a payment gateway, so it can't be resumed here."); e.status = 400; throw e; }

  if (sub.gateway === "paypal") {
    const paypalSub = await getPayPalSubscription(sub.gateway_subscription_id);
    if (paypalSub.status !== "SUSPENDED") { const e = new Error(`PayPal reports this subscription as "${paypalSub.status}", which can't be resumed — start a new subscription instead.`); e.status = 400; throw e; }
    await activatePayPalSubscription(sub.gateway_subscription_id, `Resumed by ${session.name}`);
  } else if (sub.gateway === "razorpay") {
    const rzpSub = await getRazorpaySubscription(sub.gateway_subscription_id);
    if (rzpSub.status !== "paused") { const e = new Error(`Razorpay reports this subscription as "${rzpSub.status}", which can't be resumed — start a new subscription instead.`); e.status = 400; throw e; }
    await resumeRazorpaySubscription(sub.gateway_subscription_id);
  }

  await pool.query(`UPDATE company_subscriptions SET status='active' WHERE id=?`, [sub.id]);
  await logActivity({ userId: session.id, module: "platform", action: "subscription_resumed", entityType: "company_subscription", entityId: sub.id, companyId: session.company_id, description: `${session.name} resumed the subscription` }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Downgrade protection (never silently strip data over a new plan's limit)
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
// Webhook idempotency ledger — shared table, gateway column distinguishes rows
// ---------------------------------------------------------------------------

export async function beginWebhookEvent({ gateway, eventId, eventType, resourceType, rawPayload }) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO payment_webhook_events (gateway, event_id, event_type, resource_type, payload, status) VALUES (?,?,?,?,?,'received')`,
      [gateway, eventId, eventType, resourceType || null, rawPayload]
    );
    return { alreadyProcessed: false };
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return { alreadyProcessed: true };
    throw err;
  } finally {
    conn.release();
  }
}

export async function markWebhookEventProcessed(gateway, eventId) {
  await pool.query(`UPDATE payment_webhook_events SET status='processed', processed_at=NOW() WHERE gateway=? AND event_id=?`, [gateway, eventId]);
}
export async function markWebhookEventFailed(gateway, eventId, message) {
  await pool.query(`UPDATE payment_webhook_events SET status='failed', error_message=? WHERE gateway=? AND event_id=?`, [String(message || "").slice(0, 500), gateway, eventId]);
}
