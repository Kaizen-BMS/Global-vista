import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { getSubscriptionForCompany } from "@/lib/platform/actions/subscriptions";
import { cancelBillDeskMandate } from "@/lib/payments/billdeskClient";
import { cancelRazorpaySubscription } from "@/lib/payments/razorpaySubscriptions";
import { createNotification } from "@/lib/actions/notifications";
import { hasSubscriptionBillingSchema, hasCancelAtPeriodEndColumn, hasPaymentSeatBreakdownColumns, hasGstinColumn } from "@/lib/db/schemaFlags";
import { validateGstin, normalizeGstin } from "@/lib/helpers/gstin";

/** Reads back whatever GSTIN (if any) is already on file for a company,
 * so the invoice screen can pre-fill it instead of asking again every
 * time. Returns null on a pre-migration database rather than throwing —
 * this feeds a page load, never something worth a 500 over. */
export async function getCompanyGstin(companyId) {
  if (!(await hasGstinColumn())) return null;
  const [[row]] = await pool.query(`SELECT gstin FROM companies WHERE id = ?`, [companyId]);
  return row?.gstin || null;
}

/**
 * Saves (or clears, with an empty string) the company's GSTIN for the
 * invoice/tax record. Deliberately does NOT require the value to pass
 * validateGstin's format+checksum check — the company's own instruction
 * is explicit: GST is charged the same either way, and this field is a
 * record for the buyer's own paperwork, not a gate on checkout. A
 * malformed value is still saved as typed (normalized to uppercase) so a
 * buyer who saves a typo and fixes it later isn't blocked either way.
 */
export async function updateCompanyGstin(session, gstin) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can update the GSTIN."); e.status = 403; throw e; }
  if (!(await hasGstinColumn())) { const e = new Error("GSTIN isn't available yet."); e.status = 503; throw e; }
  const normalized = normalizeGstin(gstin);
  await pool.query(`UPDATE companies SET gstin = ? WHERE id = ?`, [normalized || null, session.company_id]);
  await logActivity({ userId: session.id, module: "settings", action: "gstin_updated", entityType: "company", entityId: session.company_id, companyId: session.company_id, description: `${session.name} updated the company GSTIN` }).catch(() => {});
  return { gstin: normalized, valid: normalized ? validateGstin(normalized).valid : null };
}

/** Shared by every gateway's activation path — a company's subscription
 * just went active, so every Platform Operator gets notified regardless of
 * which gateway (BillDesk, Razorpay, ...) processed the payment. */
export async function notifyPlatformOperators(companyId, planName, gatewayLabel) {
  const [[company]] = await pool.query(`SELECT name FROM companies WHERE id=?`, [companyId]);
  const [operators] = await pool.query(`SELECT id, company_id FROM users WHERE is_platform_operator=1 AND is_deleted=0`);
  for (const op of operators) {
    await createNotification(op.company_id, op.id, {
      title: "New company subscription", message: `${company?.name} subscribed to "${planName}" via ${gatewayLabel}.`, type: "subscription_activated", link: `/platform/subscriptions`,
    }).catch(() => {});
  }
}

/**
 * Gateway-AGNOSTIC subscription actions — cancel/resume/payment-history/
 * downgrade-protection behave the same regardless of gateway. Gateway-
 * specific checkout-creation and webhook processing live in
 * billdeskBilling.js, which imports from here (never the other direction —
 * avoids a circular import).
 */

export function assertBillingSchemaReady() {
  const e = new Error("The subscription billing schema hasn't been applied to this database yet.");
  e.status = 503;
  throw e;
}

// ---------------------------------------------------------------------------
// Payment recording — idempotent on (gateway, gateway_transaction_id)
// ---------------------------------------------------------------------------

/** `seatQuantity`/`gstAmount` are a snapshot of what was ACTUALLY billed
 * this payment (schema-gated — see hasPaymentSeatBreakdownColumns) so a
 * downloaded invoice for an old payment always reflects what was charged
 * at the time, even if the company's seat count or the GST rate has
 * changed since. Omitted entirely pre-migration, same degrade-quietly
 * convention as every other optional column here. */
export async function recordSubscriptionPayment({ companyId, subscriptionId, planId, gateway, amount, currency, gatewayTransactionId, gatewayOrderId = null, gatewaySubscriptionId, status = "completed", billingCycle = null, invoiceReference = null, seatQuantity = null, gstAmount = null }) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  const seatColumnsReady = await hasPaymentSeatBreakdownColumns();
  await pool.query(
    `INSERT INTO subscription_payments (company_id, subscription_id, plan_id, gateway, gateway_transaction_id, gateway_order_id, gateway_subscription_id, amount, currency, status, billing_cycle, invoice_reference${seatColumnsReady ? ", seat_quantity, gst_amount" : ""}, payment_date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?${seatColumnsReady ? ",?,?" : ""},CURDATE())
     ON DUPLICATE KEY UPDATE id = id`,
    [companyId, subscriptionId, planId, gateway, gatewayTransactionId, gatewayOrderId, gatewaySubscriptionId, amount, currency, status, billingCycle, invoiceReference, ...(seatColumnsReady ? [seatQuantity, gstAmount] : [])]
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

/**
 * Company-initiated cancel defers the actual cutoff to the end of the
 * already-paid-for period (ends_at) whenever that's safely possible —
 * standard SaaS behavior, and what the company already paid for. It's only
 * safe to defer when we can be certain no further charge will land:
 *   - Razorpay: real API support for "stop renewing, but don't cancel until
 *     the current cycle ends" (cancel_at_cycle_end=true) — the ideal case.
 *   - manual (no gateway, no recurring charge to worry about): trivially
 *     safe to just flip the flag and let ends_at run out on its own.
 * BillDesk/PayPal recurring cancellation isn't implemented well enough to
 * trust deferring on them (see cancelBillDeskMandate's own caveat) — for
 * those, and for any subscription with no ends_at to defer to, cancelling
 * still means immediately, exactly as before.
 */
export async function cancelOwnSubscription(session) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can cancel the subscription."); e.status = 403; throw e; }
  const sub = await getSubscriptionForCompany(session.company_id);
  if (!sub) { const e = new Error("No subscription to cancel."); e.status = 404; throw e; }

  const periodStillActive = sub.ends_at && new Date(sub.ends_at) > new Date();
  const canDeferSafely = periodStillActive && (await hasCancelAtPeriodEndColumn()) && ["razorpay", "manual"].includes(sub.gateway);

  if (sub.gateway === "billdesk" && sub.gateway_subscription_id && sub.status === "active") {
    // Gateway-side mandate cancellation requires BillDesk's recurring API
    // spec (see billdeskClient.js) — not implemented yet. The subscription
    // is still cancelled on our side below so the company isn't stuck; a
    // future recurring charge from BillDesk's side may need manual
    // cancellation until this is completed.
    await cancelBillDeskMandate(sub.gateway_subscription_id).catch((err) => {
      console.error("BillDesk mandate cancellation not completed:", err.message);
    });
  } else if (sub.gateway === "razorpay" && sub.gateway_subscription_id && ["active", "past_due", "pending"].includes(sub.status)) {
    // Without this call, Razorpay's own recurring mandate keeps charging
    // the customer every billing cycle regardless of what our local status
    // says — cancelRazorpaySubscription existed but nothing ever called it,
    // so every "cancel" here only ever cancelled OUR record, never the real
    // one. cancelAtCycleEnd mirrors canDeferSafely: if we're keeping access
    // until ends_at, Razorpay should likewise stop AFTER the current cycle,
    // not claw back a cycle already paid for.
    await cancelRazorpaySubscription(sub.gateway_subscription_id, canDeferSafely).catch((err) => {
      console.error("Razorpay subscription cancellation not completed:", err.message);
    });
  }

  if (canDeferSafely) {
    // Status is deliberately left untouched — tenant.js only blocks access
    // once ends_at actually passes (or status says 'cancelled'), so leaving
    // it as-is is what keeps the company's access alive through what
    // they've already paid for.
    await pool.query(`UPDATE company_subscriptions SET cancel_at_period_end=1, cancelled_at=NOW() WHERE id=?`, [sub.id]);
  } else {
    await pool.query(`UPDATE company_subscriptions SET status='cancelled', cancelled_at=NOW() WHERE id=?`, [sub.id]);
  }
  await logActivity({ userId: session.id, module: "platform", action: "subscription_cancelled_by_company", entityType: "company_subscription", entityId: sub.id, companyId: session.company_id, description: `${session.name} cancelled the subscription${canDeferSafely ? ` (access continues until ${sub.ends_at})` : ""}` }).catch(() => {});
}

/** Resume only works for a gateway subscription the gateway itself still
 * considers suspended/paused (not cancelled/expired — those need a brand-new
 * checkout). Requires BillDesk's subscription-status API, which isn't
 * implemented yet — see billdeskClient.js. */
export async function resumeOwnSubscription(session) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can resume the subscription."); e.status = 403; throw e; }
  const sub = await getSubscriptionForCompany(session.company_id);
  if (!sub) { const e = new Error("No subscription to resume."); e.status = 404; throw e; }
  if (sub.gateway === "manual" || !sub.gateway_subscription_id) { const e = new Error("This subscription isn't managed through a payment gateway, so it can't be resumed here."); e.status = 400; throw e; }

  const e = new Error("Resuming a suspended BillDesk subscription isn't available yet — please start a new checkout, or contact the platform team.");
  e.status = 501;
  throw e;
}

// ---------------------------------------------------------------------------
// Downgrade protection (never silently strip data over a new plan's limit)
// ---------------------------------------------------------------------------

/** `seatQuantity` is only meaningful for a `pricing_model = 'per_user'`
 * plan — the purchased seat block being chosen for this checkout/switch,
 * checked against real headcount the same way max_users already is for a
 * flat plan. Omitted (e.g. the very first "which plan?" check before a
 * seat count has even been chosen yet) simply skips that one check. */
export async function assertPlanChangeAllowed(companyId, newPlanId, seatQuantity = null) {
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
  if (newPlan.pricing_model === "per_user" && seatQuantity && usage.userCount > seatQuantity) problems.push(`${usage.userCount} employees exceed the ${seatQuantity}-seat block you've chosen.`);
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
