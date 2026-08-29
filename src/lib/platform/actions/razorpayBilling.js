import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { syncCompanyModulesToPlan, getSubscriptionForCompany } from "@/lib/platform/actions/subscriptions";
import { createRazorpayPlan, createRazorpaySubscription, getRazorpaySubscription, verifyRazorpaySubscriptionSignature, updateRazorpaySubscription, updateRazorpaySubscriptionQuantity, cancelRazorpaySubscription } from "@/lib/payments/razorpaySubscriptions";
import { sendSubscriptionReceiptEmail, sendSubscriptionPaymentFailedEmail } from "@/lib/helpers/email";
import { hasSubscriptionBillingSchema, hasCouponsSchema, hasPlanRazorpayColumns, hasPendingPlanIdColumn, hasTieredPlansSchema } from "@/lib/db/schemaFlags";
import { validateCouponForPlan, redeemCoupon } from "@/lib/platform/actions/coupons";
import {
  assertBillingSchemaReady, recordSubscriptionPayment, notifyPlatformOperators,
  beginWebhookEvent, markWebhookEventProcessed, markWebhookEventFailed,
} from "@/lib/platform/actions/subscriptionBilling";

/**
 * Razorpay billing — the second gateway alongside BillDesk. Companies pick
 * one at checkout (see registration.js / SubscriptionManager.js). Shaped
 * the same way as billdeskBilling.js (checkout → pending-record → verify →
 * activate → webhook pipeline, same gateway-agnostic tables), but Razorpay's
 * actual mechanics differ:
 *  - Razorpay bills through its own recurring Subscriptions API, which
 *    requires a Plan object created on Razorpay's side first (see
 *    syncPlanToRazorpay) — there's no per-checkout "amount" the way
 *    BillDesk's one-time order-create takes one.
 *  - Razorpay Checkout is an in-page JS overlay, not a redirect — the
 *    browser gets a subscription id + the public key_id and opens the
 *    overlay itself (see loadRazorpayScript.js), then posts the callback's
 *    payment_id/signature back here for verification.
 *  - Every real HTTP call and the HMAC signature math live in
 *    razorpaySubscriptions.js — this file is the real, wired-up
 *    orchestration around it (DB writes, notifications, coupon discount,
 *    webhook idempotency), same division as BillDesk's boundary.
 */

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
 * already synced. Shared by the operator-facing sync action below and the
 * company-facing plan-change flow, which needs the target plan synced to
 * Razorpay before it can switch a subscription onto it. */
async function ensureRazorpayPlanId(plan) {
  if (plan.razorpay_plan_id) return plan.razorpay_plan_id;
  const razorpayPlanId = await createRazorpayPlan(plan);
  await pool.query(`UPDATE plans SET razorpay_plan_id = ? WHERE id = ?`, [razorpayPlanId, plan.id]);
  return razorpayPlanId;
}

/** The maintenance fee bills as its own real, separate yearly Razorpay Plan
 * — Razorpay has no "recurring amount + annual add-on" on a single
 * subscription, so a per_user plan with a maintenance fee ends up with TWO
 * parallel Razorpay subscriptions (see confirmRazorpayMaintenanceSubscription
 * and company_subscriptions.maintenance_gateway_subscription_id). */
async function ensureMaintenanceRazorpayPlanId(plan) {
  if (plan.maintenance_razorpay_plan_id) return plan.maintenance_razorpay_plan_id;
  if (!(Number(plan.maintenance_annual_fee) > 0)) return null;
  const razorpayPlanId = await createRazorpayPlan({
    id: plan.id, name: `${plan.name} (Maintenance)`, description: `${plan.name} annual maintenance fee`,
    billing_cycle: "yearly", price: plan.maintenance_annual_fee, currency: plan.currency,
  });
  await pool.query(`UPDATE plans SET maintenance_razorpay_plan_id = ? WHERE id = ?`, [razorpayPlanId, plan.id]);
  return razorpayPlanId;
}

export async function syncPlanToRazorpay(planId, operatorId) {
  if (!(await hasPlanRazorpayColumns())) assertBillingSchemaReady();
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ?`, [planId]);
  if (!plan) { const e = new Error("Plan not found."); e.status = 404; throw e; }

  const razorpayPlanId = await ensureRazorpayPlanId(plan);
  const maintenanceRazorpayPlanId = (await hasTieredPlansSchema()) ? await ensureMaintenanceRazorpayPlanId(plan) : null;

  await logActivity({ userId: operatorId, module: "platform", action: "plan_synced_to_razorpay", entityType: "plan", entityId: planId, description: `Synced plan "${plan.name}" to Razorpay (plan=${razorpayPlanId}${maintenanceRazorpayPlanId ? `, maintenance=${maintenanceRazorpayPlanId}` : ""})` }).catch(() => {});
  return { razorpayPlanId, maintenanceRazorpayPlanId };
}

// ---------------------------------------------------------------------------
// Seat-count sync — keeps a per_user subscription's Razorpay quantity
// matching the company's actual active headcount. Called (best-effort,
// never throwing into the caller's own success path) from every place an
// employee is hired, deleted, restored, or has their active/inactive
// status flipped — see users.js.
// ---------------------------------------------------------------------------

/**
 * Recomputes a company's active employee count and pushes it to Razorpay
 * as the subscription's quantity, if (and only if) the company is on an
 * active, per_user-priced, Razorpay-billed plan. A no-op for every other
 * case (flat plans, trial, no subscription, non-Razorpay gateway) — this
 * is meant to be called unconditionally after any headcount change, not
 * only when the caller already knows billing is seat-based.
 *
 * Best-effort by design: a transient Razorpay API failure here must never
 * fail the user create/delete/status-change action that triggered it — the
 * quantity will simply be corrected the next time headcount changes, or on
 * the next successful call.
 */
export async function syncSubscriptionSeatCount(companyId) {
  if (!(await hasTieredPlansSchema())) return;
  const [[sub]] = await pool.query(
    `SELECT cs.id, cs.gateway, cs.gateway_subscription_id, cs.status, cs.seat_quantity, p.pricing_model
     FROM company_subscriptions cs JOIN plans p ON p.id = cs.plan_id
     WHERE cs.company_id = ? ORDER BY cs.created_at DESC LIMIT 1`,
    [companyId]
  );
  if (!sub || sub.gateway !== "razorpay" || sub.status !== "active" || sub.pricing_model !== "per_user" || !sub.gateway_subscription_id) return;

  const [[{ userCount }]] = await pool.query(`SELECT COUNT(*) AS userCount FROM users WHERE company_id = ? AND is_deleted = 0 AND status = 'active'`, [companyId]);
  const quantity = Math.max(1, userCount);
  if (quantity === sub.seat_quantity) return; // already correct — avoid a pointless API call on every unrelated user update

  try {
    await updateRazorpaySubscriptionQuantity(sub.gateway_subscription_id, quantity);
    await pool.query(`UPDATE company_subscriptions SET seat_quantity = ? WHERE id = ?`, [quantity, sub.id]);
  } catch (err) {
    console.error(`Seat-count sync failed for company ${companyId} (subscription ${sub.gateway_subscription_id}):`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Company: create a subscription for Razorpay Checkout to open, then verify
// ---------------------------------------------------------------------------

/**
 * Creates a real Razorpay subscription and returns the id + the PUBLIC
 * key_id (never the secret) for the browser to open Razorpay Checkout with.
 * This is a placeholder record (status='pending') — only
 * confirmRazorpaySubscription (fed by a signature-verified checkout
 * callback or the webhook) ever flips it to 'active'.
 *
 * A coupon can't just change the "amount" the way BillDesk's one-time
 * order-create can — a Razorpay Subscription bills against a pre-existing
 * Plan object with a fixed price baked in on Razorpay's side. So when a
 * valid coupon is applied, this mints a throwaway Razorpay Plan at the
 * discounted price (via the same real createRazorpayPlan call
 * syncPlanToRazorpay uses) and subscribes against THAT instead of the
 * CRM plan's regular synced razorpay_plan_id — the discount is real, not
 * simulated, and nothing here guesses at a Razorpay "offers" API that
 * hasn't been verified against real documentation.
 */
export async function createRazorpayCheckoutForCompany({ companyId, planId, subscriberEmail, subscriberName, couponCode = null, actorId = null }) {
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ? AND status = 'active'`, [planId]);
  if (!plan) { const e = new Error("Plan not found or inactive."); e.status = 404; throw e; }
  if (!(Number(plan.price) > 0)) { const e = new Error("This plan is free — no payment needed. Use the plan-change flow instead."); e.status = 400; throw e; }
  if (!plan.razorpay_plan_id) { const e = new Error("This plan hasn't been connected to Razorpay yet. Please contact the platform team."); e.status = 400; throw e; }

  let couponId = null;
  let discountAmount = 0;
  let razorpayPlanIdForCheckout = plan.razorpay_plan_id;
  const couponsAvailable = await hasCouponsSchema();
  if (couponCode && couponsAvailable) {
    const validated = await validateCouponForPlan(couponCode, plan);
    couponId = validated.coupon.id;
    discountAmount = validated.discountAmount;
    // Discounted, one-off Razorpay Plan — never saved back onto the CRM
    // plan row, only used for this specific checkout's subscription.
    razorpayPlanIdForCheckout = await createRazorpayPlan({ ...plan, price: validated.finalAmount });
  } else if (couponCode && !couponsAvailable) {
    const e = new Error("Coupons aren't available yet."); e.status = 404; throw e;
  }

  const existing = await getSubscriptionForCompany(companyId);
  const tieredSchemaReady = await hasTieredPlansSchema();

  // Seat-based plans bill amount × quantity — quantity is the company's
  // current active headcount, kept in sync afterward by
  // syncSubscriptionSeatCount whenever someone is hired/removed.
  let seatQuantity = 1;
  if (tieredSchemaReady && plan.pricing_model === "per_user") {
    const [[{ userCount }]] = await pool.query(`SELECT COUNT(*) AS userCount FROM users WHERE company_id = ? AND is_deleted = 0`, [companyId]);
    seatQuantity = Math.max(1, userCount);
  }

  const { razorpaySubscriptionId } = await createRazorpaySubscription({
    razorpayPlanId: razorpayPlanIdForCheckout,
    billingCycle: plan.billing_cycle,
    quantity: seatQuantity,
    customerEmail: subscriberEmail,
    customerName: subscriberName,
    customId: `company:${companyId}`,
  });

  // The annual maintenance fee (if this plan has one) is a SEPARATE real
  // Razorpay subscription running in parallel — see
  // ensureMaintenanceRazorpayPlanId's comment for why Razorpay can't just
  // bill "amount + annual add-on" on one subscription object. The browser
  // opens a second Checkout overlay for this one right after the first
  // succeeds (see SubscriptionManager.js).
  let maintenanceRazorpaySubscriptionId = null;
  if (tieredSchemaReady && Number(plan.maintenance_annual_fee) > 0) {
    const maintenancePlanId = await ensureMaintenanceRazorpayPlanId(plan);
    if (maintenancePlanId) {
      const maintenanceResult = await createRazorpaySubscription({
        razorpayPlanId: maintenancePlanId, billingCycle: "yearly", quantity: 1,
        customerEmail: subscriberEmail, customerName: subscriberName, customId: `company:${companyId}:maintenance`,
      });
      maintenanceRazorpaySubscriptionId = maintenanceResult.razorpaySubscriptionId;
    }
  }

  if (existing) {
    // Belt-and-suspenders: switching plans normally goes through
    // changeCompanyRazorpayPlan below now (which updates the SAME
    // authorized subscription in place, so there's never a second one to
    // orphan). This path only still runs it for a subscription that isn't
    // cleanly 'active' on Razorpay (pending/past_due/suspended) — but if it
    // DOES have a real prior Razorpay subscription id, that one must still
    // be cancelled here too, or it keeps billing forever unattended
    // alongside the new one being created.
    if (existing.gateway === "razorpay" && existing.gateway_subscription_id) {
      await cancelRazorpaySubscription(existing.gateway_subscription_id, false).catch((err) => {
        console.error("Old Razorpay subscription cancellation not completed:", err.message);
      });
    }
    if (existing.gateway === "razorpay" && existing.maintenance_gateway_subscription_id) {
      await cancelRazorpaySubscription(existing.maintenance_gateway_subscription_id, false).catch((err) => {
        console.error("Old Razorpay maintenance subscription cancellation not completed:", err.message);
      });
    }
    await pool.query(
      `UPDATE company_subscriptions SET plan_id=?, gateway='razorpay', gateway_subscription_id=?, status='pending'${couponsAvailable ? ", coupon_id=?, coupon_discount_amount=?" : ""}${tieredSchemaReady ? ", maintenance_gateway_subscription_id=?, seat_quantity=?" : ""} WHERE id=?`,
      [
        planId, razorpaySubscriptionId,
        ...(couponsAvailable ? [couponId, couponId ? discountAmount : null] : []),
        ...(tieredSchemaReady ? [maintenanceRazorpaySubscriptionId, seatQuantity] : []),
        existing.id,
      ]
    );
  } else {
    await pool.query(
      `INSERT INTO company_subscriptions (company_id, plan_id, gateway, gateway_subscription_id, status, starts_at${couponsAvailable ? ", coupon_id, coupon_discount_amount" : ""}${tieredSchemaReady ? ", maintenance_gateway_subscription_id, seat_quantity" : ""}) VALUES (?,?,?,?,?,CURDATE()${couponsAvailable ? ",?,?" : ""}${tieredSchemaReady ? ",?,?" : ""})`,
      [
        companyId, planId, "razorpay", razorpaySubscriptionId, "pending",
        ...(couponsAvailable ? [couponId, couponId ? discountAmount : null] : []),
        ...(tieredSchemaReady ? [maintenanceRazorpaySubscriptionId, seatQuantity] : []),
      ]
    );
  }

  await logActivity({ userId: actorId, module: "platform", action: "razorpay_checkout_started", entityType: "company_subscription", entityId: companyId, companyId, description: `Started Razorpay checkout for plan "${plan.name}"${couponId ? ` with coupon` : ""}` }).catch(() => {});
  const perUserAmount = discountAmount ? Number(plan.price) - discountAmount : plan.price;
  return {
    razorpaySubscriptionId, razorpayKeyId: process.env.RAZORPAY_KEY_ID, planName: plan.name,
    amount: perUserAmount, seatQuantity, currency: plan.currency,
    totalAmount: Math.round(perUserAmount * seatQuantity * 100) / 100,
    maintenanceRazorpaySubscriptionId, maintenanceAmount: plan.maintenance_annual_fee || null,
  };
}

export async function startCompanyRazorpayCheckout(session, planId, { couponCode = null } = {}) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can change the subscription plan."); e.status = 403; throw e; }
  return createRazorpayCheckoutForCompany({ companyId: session.company_id, planId, subscriberEmail: session.email, subscriberName: session.name, couponCode, actorId: session.id });
}

/**
 * The real upgrade/downgrade path for a company already on an active
 * Razorpay subscription — updates the SAME authorized subscription's plan
 * in place (Razorpay's schedule_change_at API) rather than creating a
 * second subscription and trying to remember to cancel the first one.
 * `when` is "now" (switch and re-bill immediately, no proration — the new
 * plan's price applies from today) or "cycle_end" (keep the current plan
 * and its limits running until the paid-through date, then switch
 * automatically — no charge happens now).
 *
 * This is the MAIN (per-user monthly) subscription only — every plan can
 * ALSO have its own, independent annual maintenance fee (see
 * ensureMaintenanceRazorpayPlanId), and a plan switch has to reconcile that
 * separate stream too, not just the main one:
 *   - both old and new plan have a maintenance fee → update that
 *     subscription's plan in place too, same "now"/"cycle_end" timing.
 *   - old plan had one, new plan doesn't → cancel it.
 *   - old plan had NONE, new plan needs one → a brand-new recurring
 *     mandate needs fresh authorization from the customer, which can only
 *     happen through a live Checkout overlay — there is no way to
 *     silently start charging a new recurring fee later without the
 *     customer completing that Checkout right now. So this case is only
 *     supported for when="now" (the caller opens a second Checkout
 *     overlay using the returned maintenanceRazorpaySubscriptionId, same
 *     as a fresh signup); when="cycle_end" is rejected with a clear error
 *     rather than silently deferring an authorization this app can't
 *     actually collect on its own at a future date.
 */
export async function changeCompanyRazorpayPlan(session, newPlanId, when = "now") {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can change the subscription plan."); e.status = 403; throw e; }
  if (!["now", "cycle_end"].includes(when)) { const e = new Error('when must be "now" or "cycle_end".'); e.status = 400; throw e; }

  const existing = await getSubscriptionForCompany(session.company_id);
  if (!existing || existing.gateway !== "razorpay" || !existing.gateway_subscription_id || existing.status !== "active") {
    const e = new Error("This company has no active Razorpay subscription to change — start a new checkout instead."); e.status = 400; throw e;
  }
  if (existing.plan_id === Number(newPlanId)) { const e = new Error("This is already the current plan."); e.status = 400; throw e; }

  const [[newPlan]] = await pool.query(`SELECT * FROM plans WHERE id = ? AND status = 'active'`, [newPlanId]);
  if (!newPlan) { const e = new Error("Plan not found or inactive."); e.status = 404; throw e; }
  if (!(Number(newPlan.price) > 0)) { const e = new Error("This plan is free — cancel the current subscription instead of switching to it."); e.status = 400; throw e; }

  const tieredReady = await hasTieredPlansSchema();
  const hadMaintenance = tieredReady && !!existing.maintenance_gateway_subscription_id;
  const willHaveMaintenance = tieredReady && Number(newPlan.maintenance_annual_fee) > 0;

  if (!hadMaintenance && willHaveMaintenance && when === "cycle_end") {
    const e = new Error(`"${newPlan.name}" has an annual maintenance fee this company isn't currently paying — switching to it needs a new payment authorization, which only works with "Switch Now", not "At Renewal".`);
    e.status = 400; throw e;
  }

  const razorpayPlanId = await ensureRazorpayPlanId(newPlan);
  await updateRazorpaySubscription(existing.gateway_subscription_id, { razorpayPlanId, scheduleChangeAt: when });

  // Reconcile the maintenance stream in lockstep with the main one — see
  // the doc comment above for why each branch behaves differently.
  let maintenanceRazorpaySubscriptionId = null;
  let requiresMaintenanceCheckout = false;
  if (hadMaintenance && willHaveMaintenance) {
    const newMaintenancePlanId = await ensureMaintenanceRazorpayPlanId(newPlan);
    if (newMaintenancePlanId) await updateRazorpaySubscription(existing.maintenance_gateway_subscription_id, { razorpayPlanId: newMaintenancePlanId, scheduleChangeAt: when });
  } else if (hadMaintenance && !willHaveMaintenance) {
    await cancelRazorpaySubscription(existing.maintenance_gateway_subscription_id, when === "cycle_end").catch((err) => {
      console.error("Old maintenance subscription cancellation not completed:", err.message);
    });
  } else if (!hadMaintenance && willHaveMaintenance) {
    // when === "now" only — enforced above.
    const newMaintenancePlanId = await ensureMaintenanceRazorpayPlanId(newPlan);
    if (newMaintenancePlanId) {
      const result = await createRazorpaySubscription({
        razorpayPlanId: newMaintenancePlanId, billingCycle: "yearly", quantity: 1,
        customerEmail: session.email, customerName: session.name, customId: `company:${session.company_id}:maintenance`,
      });
      maintenanceRazorpaySubscriptionId = result.razorpaySubscriptionId;
      requiresMaintenanceCheckout = true;
    }
  }

  const pendingColumnReady = await hasPendingPlanIdColumn();
  const maintenanceColSet = when === "now" && tieredReady
    ? `, maintenance_gateway_subscription_id=${hadMaintenance && !willHaveMaintenance ? "NULL" : "?"}`
    : "";
  const maintenanceColParam = when === "now" && tieredReady && !(hadMaintenance && !willHaveMaintenance)
    ? [maintenanceRazorpaySubscriptionId || existing.maintenance_gateway_subscription_id]
    : [];

  if (when === "now") {
    await pool.query(
      `UPDATE company_subscriptions SET plan_id=?${pendingColumnReady ? ", pending_plan_id=NULL" : ""}${maintenanceColSet} WHERE id=?`,
      [newPlanId, ...maintenanceColParam, existing.id]
    );
    const conn = await pool.getConnection();
    try { await syncCompanyModulesToPlan(conn, session.company_id, newPlanId, session.id); } finally { conn.release(); }
  } else if (pendingColumnReady) {
    // Local plan_id (and, for the had->had maintenance case, the
    // maintenance subscription id — it doesn't change, only its plan
    // does) are deliberately left untouched here — the company keeps its
    // current plan's limits/features until Razorpay actually applies the
    // change at cycle end, which arrives back through the normal
    // subscription.charged/updated webhook (see the reconciliation in
    // confirmRazorpaySubscription below).
    await pool.query(`UPDATE company_subscriptions SET pending_plan_id=? WHERE id=?`, [newPlanId, existing.id]);
  }

  await logActivity({ userId: session.id, module: "platform", action: "razorpay_plan_change_scheduled", entityType: "company_subscription", entityId: existing.id, companyId: session.company_id, description: `${session.name} ${when === "now" ? "switched" : "scheduled a switch"} to plan "${newPlan.name}"${when === "cycle_end" ? ` (effective ${existing.ends_at})` : ""}` }).catch(() => {});

  return {
    planName: newPlan.name, when, effectiveAt: when === "cycle_end" ? existing.ends_at : null,
    requiresMaintenanceCheckout, maintenanceRazorpaySubscriptionId, razorpayKeyId: requiresMaintenanceCheckout ? process.env.RAZORPAY_KEY_ID : null,
  };
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

  return confirmRazorpaySubscription(razorpaySubscriptionId, { paymentId: razorpayPaymentId });
}

/**
 * Public registration variant — there's no session yet at the moment
 * Razorpay Checkout's callback fires during signup (the admin account
 * exists but hasn't logged in), so this can't scope by session.company_id
 * the way verifyAndConfirmRazorpaySubscription does. The signature check is
 * what actually proves authenticity here (a forged callback can't produce
 * a valid HMAC without the webhook/checkout secret) — same trust boundary
 * confirmCompanySubscriptionFromBillDesk relies on for its own
 * session-less register/confirm path.
 */
export async function verifyAndConfirmRazorpaySubscriptionPublic({ razorpaySubscriptionId, razorpayPaymentId, razorpaySignature }) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  const validSignature = verifyRazorpaySubscriptionSignature({ paymentId: razorpayPaymentId, subscriptionId: razorpaySubscriptionId, signature: razorpaySignature });
  if (!validSignature) { const e = new Error("Payment verification failed. Please contact support."); e.status = 400; throw e; }
  return confirmRazorpaySubscription(razorpaySubscriptionId, { paymentId: razorpayPaymentId });
}

/**
 * The second Checkout overlay's callback — same signature-verification
 * trust boundary as the main subscription, then records the maintenance
 * payment directly (rather than waiting on the payment.captured webhook,
 * same "close the revenue gap if the webhook is missed/delayed" reasoning
 * confirmRazorpaySubscription's own paymentId branch documents).
 */
export async function verifyAndConfirmRazorpayMaintenanceSubscription({ session, razorpaySubscriptionId, razorpayPaymentId, razorpaySignature }) {
  if (!(await hasTieredPlansSchema())) { const e = new Error("Tiered plans aren't available yet."); e.status = 503; throw e; }
  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='razorpay' AND maintenance_gateway_subscription_id = ? AND company_id = ? LIMIT 1`, [razorpaySubscriptionId, session.company_id]);
  if (!row) { const e = new Error("No matching maintenance subscription found for this company."); e.status = 404; throw e; }

  const validSignature = verifyRazorpaySubscriptionSignature({ paymentId: razorpayPaymentId, subscriptionId: razorpaySubscriptionId, signature: razorpaySignature });
  if (!validSignature) { const e = new Error("Payment verification failed. Please contact support."); e.status = 400; throw e; }

  const result = await confirmRazorpayMaintenanceSubscription(razorpaySubscriptionId);
  const [[plan]] = await pool.query(`SELECT name, maintenance_annual_fee, currency FROM plans WHERE id=?`, [row.plan_id]);
  if (plan?.maintenance_annual_fee) {
    await recordSubscriptionPayment({
      companyId: row.company_id, subscriptionId: row.id, planId: row.plan_id, gateway: "razorpay",
      amount: plan.maintenance_annual_fee, currency: plan.currency || "INR",
      gatewayTransactionId: razorpayPaymentId, gatewaySubscriptionId: razorpaySubscriptionId, status: "completed", billingCycle: "yearly",
    }).catch(() => {});
  }
  return result;
}

/**
 * Gateway-of-truth confirmation, shared by the checkout-callback path
 * (after signature verification) and the webhook handler. Always re-fetches
 * from Razorpay before writing anything — safe to call twice.
 *
 * `paymentId` is only passed by the checkout-callback path, which has a
 * signature-verified Razorpay payment id in hand at the exact moment a
 * subscription first goes active. Without this, revenue depended entirely
 * on the `payment.captured` webhook ever arriving — if the webhook isn't
 * registered yet (or a delivery is missed), the subscription still
 * activates correctly but no row is ever written to subscription_payments,
 * so Collected Revenue silently stays at zero even though real money moved.
 * Recording it here closes that gap; the later webhook (if it does arrive)
 * is a safe no-op via recordSubscriptionPayment's idempotent
 * (gateway, gateway_transaction_id) key — same real payment id either way.
 */
export async function confirmRazorpaySubscription(razorpaySubscriptionId, { paymentId = null } = {}) {
  if (!(await hasSubscriptionBillingSchema())) assertBillingSchemaReady();
  const rzpSub = await getRazorpaySubscription(razorpaySubscriptionId);
  const mappedStatus = RAZORPAY_STATUS_MAP[rzpSub.status] || "pending";

  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE gateway='razorpay' AND gateway_subscription_id = ? LIMIT 1`, [razorpaySubscriptionId]);
  if (!row) { const e = new Error(`No local subscription record for Razorpay subscription ${razorpaySubscriptionId}.`); e.status = 404; throw e; }

  // Reconcile a scheduled (cycle_end) plan change once Razorpay has
  // actually applied it — the subscription's own plan_id will have flipped
  // to the new plan's razorpay_plan_id by then. Purely a safety-net re-sync:
  // changeCompanyRazorpayPlan's "now" path already updates plan_id itself
  // without waiting for this; this is what catches the "cycle_end" case
  // when the change finally lands, via whichever webhook fires next.
  let planId = row.plan_id;
  if (rzpSub.plan_id) {
    const [[matchedPlan]] = await pool.query(`SELECT id, name FROM plans WHERE razorpay_plan_id = ?`, [rzpSub.plan_id]);
    if (matchedPlan && matchedPlan.id !== row.plan_id) planId = matchedPlan.id;
  }
  const planChanged = planId !== row.plan_id;
  const pendingColumnReady = await hasPendingPlanIdColumn();

  const wasAlreadyActive = row.status === "active";
  const nextBillingAt = rzpSub.charge_at ? new Date(rzpSub.charge_at * 1000).toISOString().slice(0, 10) : null;

  // A recurring subscription has no fixed "ends_at" the way a trial/manual
  // one does — it renews automatically at next_billing_at. But the
  // Platform Console's "Expiry" column and the 30/7/3/1-day expiry-warning
  // cron (runSubscriptionWarningsCheck) both key off ends_at, and neither
  // knew that: ends_at stayed NULL forever for every gateway-recurring
  // subscription, so it always showed "No expiry" and the warning email/
  // notification never fired. Keeping ends_at in sync with next_billing_at
  // means both now work correctly — "ends_at" reads as "current paid
  // period ends" (and then rolls forward automatically on the next
  // successful charge), not "this subscription is one-time and terminal."
  await pool.query(
    `UPDATE company_subscriptions SET status=?, plan_id=?, gateway_customer_id=?, next_billing_at=?, ends_at=?${pendingColumnReady && planChanged ? ", pending_plan_id=NULL" : ""} WHERE id=?`,
    [mappedStatus, planId, rzpSub.customer_id || null, nextBillingAt, nextBillingAt, row.id]
  );

  if (planChanged) {
    const [[newPlan]] = await pool.query(`SELECT name FROM plans WHERE id=?`, [planId]);
    const [admins] = await pool.query(`SELECT id FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
    for (const admin of admins) {
      await createNotification(row.company_id, admin.id, { title: "Plan changed", message: `Your scheduled plan change has taken effect — you're now on "${newPlan?.name}".`, type: "subscription_changed", link: `/workspace/settings/subscription` }).catch(() => {});
    }
    await logActivity({ userId: null, module: "platform", action: "razorpay_plan_change_applied", entityType: "company_subscription", entityId: row.id, companyId: row.company_id, description: `Scheduled plan change to "${newPlan?.name}" took effect` }).catch(() => {});
  }

  if (mappedStatus === "active") {
    const conn = await pool.getConnection();
    try {
      await syncCompanyModulesToPlan(conn, row.company_id, planId, null);
    } finally {
      conn.release();
    }
    if (!wasAlreadyActive) {
      const [[plan]] = await pool.query(`SELECT name, price, currency FROM plans WHERE id=?`, [planId]);
      if (paymentId && plan?.price) {
        const chargedAmount = Math.max(0, Number(plan.price) - Number(row.coupon_discount_amount || 0));
        await recordSubscriptionPayment({
          companyId: row.company_id, subscriptionId: row.id, planId, gateway: "razorpay",
          amount: chargedAmount.toFixed(2), currency: plan.currency || "INR",
          gatewayTransactionId: paymentId, gatewaySubscriptionId: razorpaySubscriptionId, status: "completed",
        }).catch(() => {});
        if (row.coupon_id) {
          await redeemCoupon({ couponId: row.coupon_id, companyId: row.company_id, subscriptionId: row.id, discountAmount: row.coupon_discount_amount }).catch(() => {});
        }
      }
      const [admins] = await pool.query(`SELECT id FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
      for (const admin of admins) {
        await createNotification(row.company_id, admin.id, {
          title: "Subscription activated", message: `Your "${plan?.name}" subscription is now active.`, type: "subscription_activated", link: `/workspace/settings/subscription`,
        }).catch(() => {});
      }
      await notifyPlatformOperators(row.company_id, plan?.name, "Razorpay");
      await logActivity({ userId: null, module: "platform", action: "razorpay_subscription_activated", entityType: "company_subscription", entityId: row.id, companyId: row.company_id, description: `Razorpay subscription ${razorpaySubscriptionId} activated` }).catch(() => {});
    }
  }

  return { status: mappedStatus, companyId: row.company_id, subscriptionId: row.id };
}

/** Looks a Razorpay subscription id up against EITHER column — the primary
 * (per-user/flat) subscription or the parallel maintenance one — since a
 * webhook event just carries a bare subscription id with no indication of
 * which stream it belongs to. `isMaintenance` tells callers which. */
async function findSubscriptionRowByRazorpayId(razorpaySubscriptionId) {
  const tieredReady = await hasTieredPlansSchema();
  const [[row]] = await pool.query(
    tieredReady
      ? `SELECT *, (maintenance_gateway_subscription_id = ?) AS isMaintenance FROM company_subscriptions WHERE gateway='razorpay' AND (gateway_subscription_id = ? OR maintenance_gateway_subscription_id = ?) LIMIT 1`
      : `SELECT *, 0 AS isMaintenance FROM company_subscriptions WHERE gateway='razorpay' AND gateway_subscription_id = ? LIMIT 1`,
    tieredReady ? [razorpaySubscriptionId, razorpaySubscriptionId, razorpaySubscriptionId] : [razorpaySubscriptionId]
  );
  return row ? { ...row, isMaintenance: !!row.isMaintenance } : null;
}

/**
 * Maintenance-subscription counterpart to confirmRazorpaySubscription —
 * far simpler, since a maintenance renewal never changes which plan/modules
 * a company has (that's entirely driven by the main subscription). Mostly
 * just keeps its own status current so the Platform Console can show
 * whether the maintenance fee is actually being collected.
 */
export async function confirmRazorpayMaintenanceSubscription(razorpaySubscriptionId) {
  if (!(await hasTieredPlansSchema())) return { status: "pending" };
  const rzpSub = await getRazorpaySubscription(razorpaySubscriptionId);
  const mappedStatus = RAZORPAY_STATUS_MAP[rzpSub.status] || "pending";
  const [[row]] = await pool.query(`SELECT * FROM company_subscriptions WHERE maintenance_gateway_subscription_id = ? LIMIT 1`, [razorpaySubscriptionId]);
  if (!row) { const e = new Error(`No local subscription record for Razorpay maintenance subscription ${razorpaySubscriptionId}.`); e.status = 404; throw e; }
  return { status: mappedStatus, companyId: row.company_id, subscriptionId: row.id };
}

async function handleRazorpayPaymentFailed(payload) {
  const razorpaySubscriptionId = payload.payment?.entity?.subscription_id || payload.subscription?.entity?.id;
  if (!razorpaySubscriptionId) return;
  const row = await findSubscriptionRowByRazorpayId(razorpaySubscriptionId);
  if (!row) return;

  const [[plan]] = await pool.query(`SELECT name FROM plans WHERE id=?`, [row.plan_id]);
  // A failed MAINTENANCE payment is an administrative fee falling behind,
  // not the core subscription lapsing — it doesn't cut off daily software
  // access the way the main subscription's status does (see tenant.js).
  // Admins still need to know, so they can retry it with Razorpay directly.
  if (!row.isMaintenance) {
    await pool.query(`UPDATE company_subscriptions SET status='past_due' WHERE id=?`, [row.id]);
  }

  const [admins] = await pool.query(`SELECT id, email FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
  for (const admin of admins) {
    await createNotification(row.company_id, admin.id, {
      title: row.isMaintenance ? "Maintenance payment failed" : "Payment failed",
      message: row.isMaintenance
        ? `Your "${plan?.name}" annual maintenance payment failed. Please update your payment method with Razorpay.`
        : `Your "${plan?.name}" subscription payment failed. Please update your payment method with Razorpay.`,
      type: "payment_failed", link: `/workspace/settings/subscription`,
    }).catch(() => {});
    if (admin.email) await sendSubscriptionPaymentFailedEmail({ to: admin.email, companyId: row.company_id, planName: plan?.name || "your plan" }).catch(() => {});
  }
}

async function handleRazorpayPaymentCaptured(payload) {
  const payment = payload.payment?.entity;
  const razorpaySubscriptionId = payment?.subscription_id;
  if (!razorpaySubscriptionId) return; // a one-off payment unrelated to a subscription — nothing for this module to record
  const row = await findSubscriptionRowByRazorpayId(razorpaySubscriptionId);
  if (!row) return;

  await recordSubscriptionPayment({
    companyId: row.company_id, subscriptionId: row.id, planId: row.plan_id, gateway: "razorpay",
    amount: (payment.amount || 0) / 100, currency: payment.currency || "INR",
    gatewayTransactionId: payment.id, gatewayOrderId: payment.order_id || null, gatewaySubscriptionId: razorpaySubscriptionId, status: "completed",
    billingCycle: row.isMaintenance ? "yearly" : undefined,
  });

  // Maintenance renewals don't gate plan/module access or coupon redemption
  // — that's all driven by the main subscription only.
  if (row.isMaintenance) {
    const [[plan]] = await pool.query(`SELECT name FROM plans WHERE id=?`, [row.plan_id]);
    const [admins] = await pool.query(`SELECT email FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
    for (const admin of admins) {
      if (admin.email) {
        await sendSubscriptionReceiptEmail({
          to: admin.email, companyId: row.company_id, planName: `${plan?.name || "Plan"} (Maintenance)`,
          amount: (payment.amount || 0) / 100, currency: payment.currency || "INR",
          billingCycle: "yearly", gatewayName: "Razorpay", gatewayTransactionId: payment.id, gatewaySubscriptionId: razorpaySubscriptionId,
        }).catch(() => {});
      }
    }
    return;
  }

  if (row.coupon_id) {
    await redeemCoupon({ couponId: row.coupon_id, companyId: row.company_id, subscriptionId: row.id, discountAmount: row.coupon_discount_amount }).catch(() => {});
  }

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
        billingCycle: plan?.billing_cycle || "", gatewayName: "Razorpay", gatewayTransactionId: payment.id, gatewaySubscriptionId: razorpaySubscriptionId,
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
      case "subscription.resumed": {
        const subId = payload.subscription?.entity?.id;
        if (!subId) break;
        const row = await findSubscriptionRowByRazorpayId(subId);
        if (row?.isMaintenance) await confirmRazorpayMaintenanceSubscription(subId);
        else await confirmRazorpaySubscription(subId);
        break;
      }
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
