import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { syncCompanyModulesToPlan, getSubscriptionForCompany } from "@/lib/platform/actions/subscriptions";
import { createRazorpayPlan, createRazorpaySubscription, getRazorpaySubscription, verifyRazorpaySubscriptionSignature, updateRazorpaySubscription, updateRazorpaySubscriptionQuantity, cancelRazorpaySubscription, razorpayPeriodForMonths, billingCyclePeriod } from "@/lib/payments/razorpaySubscriptions";
import { sendSubscriptionReceiptEmail, sendSubscriptionPaymentFailedEmail } from "@/lib/helpers/email";
import { hasSubscriptionBillingSchema, hasCouponsSchema, hasPlanRazorpayColumns, hasPendingPlanIdColumn, hasTieredPlansSchema, hasDurationPricingSchema, hasCommitmentMonthsColumn } from "@/lib/db/schemaFlags";
import { validateCouponForPlan, redeemCoupon } from "@/lib/platform/actions/coupons";
import { withGst, gstAmount, GST_RATE } from "@/lib/helpers/gst";
import { isValidSeatQuantity, normalizeSeatQuantity, DEFAULT_SEATS, SEAT_STEP } from "@/lib/helpers/seats";
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

/** A configured commitment tier for a plan (12/24/36 months, or whatever
 * the operator set up — see plan_duration_prices) — null for the plain
 * 1-month case, which just uses the plan's own price/cycle unchanged. */
async function getDurationTier(planId, durationMonths) {
  if (durationMonths <= 1) return null;
  if (!(await hasDurationPricingSchema())) { const e = new Error("Duration-based pricing isn't available yet."); e.status = 503; throw e; }
  const [[tier]] = await pool.query(`SELECT * FROM plan_duration_prices WHERE plan_id = ? AND duration_months = ? AND status = 'active'`, [planId, durationMonths]);
  if (!tier) { const e = new Error(`This plan has no ${durationMonths}-month pricing configured.`); e.status = 400; throw e; }
  return tier;
}

/** Ensures a Razorpay Plan exists for one specific commitment tier — bills
 * tier.price × tier.duration_months once every `duration_months` (the
 * subscription's own `quantity` still multiplies that by seat count for a
 * per_user plan, same mechanism the plain 1-month case already uses).
 * Idempotent via plan_duration_prices.razorpay_plan_id — cleared by
 * setDurationPrice whenever the tier's price changes, so a stale amount is
 * never reused. */
async function ensureDurationRazorpayPlanId(plan, tier) {
  if (tier.razorpay_plan_id) return tier.razorpay_plan_id;
  const { period, interval } = razorpayPeriodForMonths(tier.duration_months);
  const razorpayPlanId = await createRazorpayPlan(plan, {
    periodOverride: period, intervalOverride: interval,
    nameOverride: `${plan.name} (${tier.duration_months}mo term)`,
    amountOverride: Number(tier.price) * tier.duration_months,
  });
  await pool.query(`UPDATE plan_duration_prices SET razorpay_plan_id = ? WHERE id = ?`, [razorpayPlanId, tier.id]);
  return razorpayPlanId;
}

/**
 * `force` re-creates a brand-new Razorpay Plan (a new plan_XXXX id) even
 * though one is already cached, instead of the normal idempotent no-op —
 * the ONLY way to pick up a change to how createRazorpayPlan computes its
 * amount (e.g. the GST rate) for a plan that was already synced before
 * that change shipped. This never touches or cancels any subscription
 * already billing against the old Razorpay plan_id — Razorpay has no
 * "edit a plan's amount" API, so existing subscribers keep renewing at
 * their original (pre-change) amount until they separately switch plans;
 * `force` only affects what NEW checkouts/plan-switches get quoted. Also
 * re-syncs every configured commitment tier (plan_duration_prices) for
 * the same reason, since those go through the same createRazorpayPlan.
 */
export async function syncPlanToRazorpay(planId, operatorId, { force = false } = {}) {
  if (!(await hasPlanRazorpayColumns())) assertBillingSchemaReady();
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ?`, [planId]);
  if (!plan) { const e = new Error("Plan not found."); e.status = 404; throw e; }

  if (force && plan.razorpay_plan_id) {
    await pool.query(`UPDATE plans SET razorpay_plan_id = NULL WHERE id = ?`, [planId]);
    plan.razorpay_plan_id = null;
  }
  const razorpayPlanId = await ensureRazorpayPlanId(plan);

  if (force && (await hasDurationPricingSchema())) {
    const [tiers] = await pool.query(`SELECT * FROM plan_duration_prices WHERE plan_id = ? AND status = 'active'`, [planId]);
    for (const tier of tiers) {
      if (tier.razorpay_plan_id) await pool.query(`UPDATE plan_duration_prices SET razorpay_plan_id = NULL WHERE id = ?`, [tier.id]);
      await ensureDurationRazorpayPlanId(plan, { ...tier, razorpay_plan_id: null });
    }
  }

  await logActivity({ userId: operatorId, module: "platform", action: "plan_synced_to_razorpay", entityType: "plan", entityId: planId, description: `${force ? "Re-synced" : "Synced"} plan "${plan.name}" to Razorpay (plan=${razorpayPlanId})` }).catch(() => {});
  return { razorpayPlanId };
}

// ---------------------------------------------------------------------------
// Seats — a per_user plan bills against a PURCHASED seat block (5, 10, 15,
// …), never auto-synced to real headcount. Buying more seats is an
// explicit, buyer-initiated action (this section); enforceUserLimit
// (tenant.js) is what actually stops a company from hiring past whatever
// block it has already paid for.
// ---------------------------------------------------------------------------

/**
 * Changes an ALREADY-ACTIVE per_user Razorpay subscription's purchased
 * seat count — the only other place seat count changes (initial checkout)
 * goes through createRazorpayCheckoutForCompany/changeCompanyRazorpayPlan
 * instead. Only ever increases/decreases the Razorpay `quantity` — the
 * per-seat amount on the underlying Plan is untouched, so a coupon's
 * discount (baked into that per-seat amount at signup, if any) is simply
 * carried across every seat, new or old, at the same rate.
 */
export async function updateCompanySeatQuantity(session, seatQuantity) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can change the number of seats."); e.status = 403; throw e; }
  if (!isValidSeatQuantity(seatQuantity)) { const e = new Error(`Seats must be a multiple of ${SEAT_STEP}.`); e.status = 400; throw e; }
  if (!(await hasTieredPlansSchema())) { const e = new Error("Seat-based billing isn't available yet."); e.status = 503; throw e; }

  const [[sub]] = await pool.query(
    `SELECT cs.id, cs.gateway, cs.gateway_subscription_id, cs.status, cs.seat_quantity, p.name AS plan_name, p.pricing_model
     FROM company_subscriptions cs JOIN plans p ON p.id = cs.plan_id
     WHERE cs.company_id = ? ORDER BY cs.created_at DESC LIMIT 1`,
    [session.company_id]
  );
  if (!sub || sub.gateway !== "razorpay" || sub.status !== "active" || !sub.gateway_subscription_id) { const e = new Error("No active Razorpay subscription to update."); e.status = 400; throw e; }
  if (sub.pricing_model !== "per_user") { const e = new Error("This plan doesn't bill per seat."); e.status = 400; throw e; }
  if (seatQuantity === sub.seat_quantity) return { seatQuantity };

  await updateRazorpaySubscriptionQuantity(sub.gateway_subscription_id, seatQuantity);
  await pool.query(`UPDATE company_subscriptions SET seat_quantity = ? WHERE id = ?`, [seatQuantity, sub.id]);
  await logActivity({ userId: session.id, module: "platform", action: "seat_quantity_changed", entityType: "company_subscription", entityId: sub.id, companyId: session.company_id, description: `${session.name} changed "${sub.plan_name}" seats from ${sub.seat_quantity} to ${seatQuantity}` }).catch(() => {});
  return { seatQuantity };
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
export async function createRazorpayCheckoutForCompany({ companyId, planId, subscriberEmail, subscriberName, couponCode = null, actorId = null, durationMonths = 1, seatQuantity: requestedSeats }) {
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ? AND status = 'active'`, [planId]);
  if (!plan) { const e = new Error("Plan not found or inactive."); e.status = 404; throw e; }
  if (!(Number(plan.price) > 0)) { const e = new Error("This plan is free — no payment needed. Use the plan-change flow instead."); e.status = 400; throw e; }
  if (!plan.razorpay_plan_id) { const e = new Error("This plan hasn't been connected to Razorpay yet. Please contact the platform team."); e.status = 400; throw e; }

  const months = Number(durationMonths) || 1;
  const tier = months > 1 ? await getDurationTier(planId, months) : null;

  // Seat-based plans bill against a purchased block the buyer chooses —
  // 5, 10, 15, … (the account owner counts as the first seat) — never
  // auto-synced to real headcount (see updateCompanySeatQuantity for how
  // an existing subscriber later buys more). A flat plan always bills
  // quantity=1; Razorpay's own multiplier does the rest.
  const seatQuantity = plan.pricing_model === "per_user" ? normalizeSeatQuantity(requestedSeats ?? DEFAULT_SEATS) : 1;

  let couponId = null;
  let discountAmount = 0;
  let razorpayPlanIdForCheckout = plan.razorpay_plan_id;
  const couponsAvailable = await hasCouponsSchema();
  if (couponCode && months > 1) {
    // A coupon discounts a single-cycle amount — stacking it with an
    // already-discounted multi-month commitment price is two different
    // discount mechanisms fighting over the same number, so this is
    // refused rather than silently picking one.
    const e = new Error("Coupons can only be applied to monthly billing, not a multi-month commitment plan."); e.status = 400; throw e;
  } else if (couponCode && couponsAvailable) {
    // The coupon discounts the whole seat-multiplied total ONCE (the
    // company's own formula: (amount/user × users × months) − discount),
    // never once per seat — so validate against that total, then divide
    // the discounted total back down to a per-seat price for Razorpay's
    // own quantity multiplier to reconstruct it exactly.
    const baseTotal = Number(plan.price) * seatQuantity;
    const validated = await validateCouponForPlan(couponCode, plan, baseTotal);
    couponId = validated.coupon.id;
    discountAmount = validated.discountAmount;
    const perSeatFinal = Math.round((validated.finalAmount / seatQuantity) * 100) / 100;
    // Discounted, one-off Razorpay Plan — never saved back onto the CRM
    // plan row, only used for this specific checkout's subscription.
    razorpayPlanIdForCheckout = await createRazorpayPlan({ ...plan, price: perSeatFinal });
  } else if (couponCode && !couponsAvailable) {
    const e = new Error("Coupons aren't available yet."); e.status = 404; throw e;
  } else if (tier) {
    // Commitment tier — the Plan bills tier.price x months once per
    // `months`, not plan.price monthly. See ensureDurationRazorpayPlanId.
    razorpayPlanIdForCheckout = await ensureDurationRazorpayPlanId(plan, tier);
  }

  const existing = await getSubscriptionForCompany(companyId);
  const tieredSchemaReady = await hasTieredPlansSchema();
  const commitmentColumnReady = await hasCommitmentMonthsColumn();

  // A commitment tier's real period/interval (e.g. 36 months ->
  // period="yearly", interval=3) is NOT the same thing as the plan's own
  // billing_cycle label — passing billing_cycle straight through here for
  // a tiered checkout used to leave total_count keyed off nothing (falling
  // back to a flat, wrong default) exactly what caused Razorpay to reject
  // any commitment longer than a year with "Exceeds the maximum
  // total_count". Always compute the ACTUAL period/interval this specific
  // checkout bills against, whichever of the two paths it took.
  const { period, interval } = tier ? razorpayPeriodForMonths(months) : billingCyclePeriod(plan.billing_cycle);
  const { razorpaySubscriptionId } = await createRazorpaySubscription({
    razorpayPlanId: razorpayPlanIdForCheckout,
    period, interval,
    quantity: seatQuantity,
    customerEmail: subscriberEmail,
    customerName: subscriberName,
    customId: `company:${companyId}`,
  });

  if (existing) {
    // Belt-and-suspenders: switching plans normally goes through
    // changeCompanyRazorpayPlan below now (which updates the SAME
    // authorized subscription in place, so there's never a second one to
    // orphan). This path only still runs it for a subscription that isn't
    // cleanly 'active' on Razorpay (pending/past_due/suspended) — but if it
    // DOES have a real prior Razorpay subscription id, that one must still
    // be cancelled here too, or it keeps billing forever unattended
    // alongside the new one being created. A leftover maintenance
    // subscription from before the annual-maintenance-fee feature was
    // removed is cancelled the same way — legacy cleanup only, nothing
    // here ever creates a new one.
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
      `UPDATE company_subscriptions SET plan_id=?, gateway='razorpay', gateway_subscription_id=?, status='pending'${couponsAvailable ? ", coupon_id=?, coupon_discount_amount=?" : ""}${tieredSchemaReady ? ", maintenance_gateway_subscription_id=NULL, seat_quantity=?" : ""}${commitmentColumnReady ? ", commitment_months=?" : ""} WHERE id=?`,
      [
        planId, razorpaySubscriptionId,
        ...(couponsAvailable ? [couponId, couponId ? discountAmount : null] : []),
        ...(tieredSchemaReady ? [seatQuantity] : []),
        ...(commitmentColumnReady ? [months] : []),
        existing.id,
      ]
    );
  } else {
    await pool.query(
      `INSERT INTO company_subscriptions (company_id, plan_id, gateway, gateway_subscription_id, status, starts_at${couponsAvailable ? ", coupon_id, coupon_discount_amount" : ""}${tieredSchemaReady ? ", seat_quantity" : ""}${commitmentColumnReady ? ", commitment_months" : ""}) VALUES (?,?,?,?,?,CURDATE()${couponsAvailable ? ",?,?" : ""}${tieredSchemaReady ? ",?" : ""}${commitmentColumnReady ? ",?" : ""})`,
      [
        companyId, planId, "razorpay", razorpaySubscriptionId, "pending",
        ...(couponsAvailable ? [couponId, couponId ? discountAmount : null] : []),
        ...(tieredSchemaReady ? [seatQuantity] : []),
        ...(commitmentColumnReady ? [months] : []),
      ]
    );
  }

  await logActivity({ userId: actorId, module: "platform", action: "razorpay_checkout_started", entityType: "company_subscription", entityId: companyId, companyId, description: `Started Razorpay checkout for plan "${plan.name}"${couponId ? ` with coupon` : ""}${tier ? ` (${months}-month commitment)` : ""}${seatQuantity > 1 ? ` (${seatQuantity} seats)` : ""}` }).catch(() => {});
  // Informational only (drives the Razorpay Checkout overlay's own
  // description text) — GST-exclusive, matching the pre-GST "Subtotal"
  // line every invoice preview shows; the real charge (subtotal × 1.18)
  // is computed once, at the single source of truth, inside
  // createRazorpayPlan.
  const cycleBase = tier ? Number(tier.price) * tier.duration_months : Number(plan.price);
  const totalAmount = Math.round((cycleBase * seatQuantity - discountAmount) * 100) / 100;
  const perUserAmount = Math.round((totalAmount / seatQuantity) * 100) / 100;
  return {
    razorpaySubscriptionId, razorpayKeyId: process.env.RAZORPAY_KEY_ID, planName: plan.name,
    amount: perUserAmount, seatQuantity, currency: plan.currency, totalAmount,
  };
}

export async function startCompanyRazorpayCheckout(session, planId, { couponCode = null, durationMonths = 1, seatQuantity } = {}) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can change the subscription plan."); e.status = 403; throw e; }
  return createRazorpayCheckoutForCompany({ companyId: session.company_id, planId, subscriberEmail: session.email, subscriberName: session.name, couponCode, actorId: session.id, durationMonths, seatQuantity });
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
 * Plans no longer carry a separate annual maintenance fee — any
 * `maintenance_gateway_subscription_id` still present on a company's
 * subscription row is a leftover from before that feature was removed,
 * and is cancelled here (never recreated) purely to stop it billing.
 */
/**
 * Razorpay flatly refuses to change the Plan on a subscription whose
 * mandate was authorized via UPI Autopay — UPI mandates are locked to the
 * amount/plan they were registered with, unlike card mandates. That
 * refusal previously surfaced as whatever raw sentence Razorpay's API
 * happened to return (razorpayClient.js's razorpayFetch throws
 * `error.description` verbatim), which read to a company owner as an
 * unexplained, unactionable error. This turns that ONE specific,
 * recognizable failure into a clear explanation and a real next step;
 * every other update failure still passes through unchanged.
 */
function rethrowIfUpiPlanChangeRestriction(err) {
  if (/upi/i.test(err?.message || "")) {
    const e = new Error(
      "Razorpay doesn't allow changing the plan on a subscription that was authorized via UPI Autopay — this is a restriction on Razorpay's side, not something we can override. " +
      "To move this company to a different plan, cancel the current subscription first, then start a fresh checkout for the new plan."
    );
    e.status = 400;
    throw e;
  }
  // "Can't update subscription when subscription is not in Authenticated
  // or Active state" — Razorpay's own state, not ours: our local
  // company_subscriptions row can say status='active' (e.g. it WAS active
  // and is only now stuck, or a past write marked it active) while the
  // real subscription object on Razorpay's side never completed its
  // first payment authorization (created/pending, halted, or already
  // cancelled/expired there). Switching a plan in place only works on an
  // authorized subscription — Razorpay's rule, not a bug in this app —
  // so the real fix is a fresh checkout, same next step as the UPI case.
  if (/not in authenticated or active state/i.test(err?.message || "")) {
    const e = new Error(
      "This subscription hasn't completed authorization on Razorpay's side, so its plan/seats can't be changed in place. " +
      "Cancel it and start a fresh checkout for the plan you want instead."
    );
    e.status = 409;
    throw e;
  }
  throw err;
}

export async function changeCompanyRazorpayPlan(session, newPlanId, when = "now", couponCode = null, requestedSeats = undefined, durationMonths = 1) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can change the subscription plan."); e.status = 403; throw e; }
  if (!["now", "cycle_end"].includes(when)) { const e = new Error('when must be "now" or "cycle_end".'); e.status = 400; throw e; }

  const existing = await getSubscriptionForCompany(session.company_id);
  if (!existing || existing.gateway !== "razorpay" || !existing.gateway_subscription_id || existing.status !== "active") {
    const e = new Error("This company has no active Razorpay subscription to change — start a new checkout instead."); e.status = 400; throw e;
  }
  if (existing.plan_id === Number(newPlanId)) { const e = new Error("This is already the current plan."); e.status = 400; throw e; }

  // Self-healing check: our own status='active' can be stale/wrong (a
  // manual platform-side override, or a webhook that never arrived) even
  // though Razorpay itself never actually authorized this subscription
  // (no card/UPI mandate registered, paid_count=0 — status stuck at
  // "created"). Razorpay refuses to update the plan/quantity on anything
  // but an authenticated/active subscription, and would otherwise fail
  // here with an opaque "not in Authenticated or Active state" error every
  // single time. Verifying against Razorpay's real, live status FIRST and
  // reconciling our own record to match it means this corrects itself the
  // moment it's discovered, instead of dead-ending on the same error
  // forever — the very next load of this page shows the correct
  // "Subscribe"/"Complete Payment" fresh-checkout button instead.
  const liveSub = await getRazorpaySubscription(existing.gateway_subscription_id);
  if (!["authenticated", "active"].includes(liveSub.status)) {
    const reconciledStatus = RAZORPAY_STATUS_MAP[liveSub.status] || "pending";
    await pool.query(`UPDATE company_subscriptions SET status = ? WHERE id = ?`, [reconciledStatus, existing.id]);
    const e = new Error(
      `This subscription was never actually completed on Razorpay's side (it never finished payment authorization). ` +
      `We've corrected the record — refresh this page and you'll see "Subscribe"/"Complete Payment" instead, which starts a real checkout.`
    );
    e.status = 409;
    throw e;
  }

  const [[newPlan]] = await pool.query(`SELECT * FROM plans WHERE id = ? AND status = 'active'`, [newPlanId]);
  if (!newPlan) { const e = new Error("Plan not found or inactive."); e.status = 404; throw e; }
  if (!(Number(newPlan.price) > 0)) { const e = new Error("This plan is free — cancel the current subscription instead of switching to it."); e.status = 400; throw e; }

  const tieredReady = await hasTieredPlansSchema();
  const couponsAvailable = await hasCouponsSchema();
  const commitmentColumnReady = await hasCommitmentMonthsColumn();

  // Same commitment-tier concept the fresh-checkout path uses — a company
  // switching plans in place can pick a longer term too, not just the
  // plain monthly price.
  const months = Number(durationMonths) || 1;
  const tier = months > 1 ? await getDurationTier(newPlanId, months) : null;

  // Seat quantity for the plan being switched TO — a fresh choice, not
  // carried over from whatever the old plan's quantity happened to be
  // (switching from a flat plan has no prior seat count to inherit from).
  const seatQuantity = newPlan.pricing_model === "per_user" ? normalizeSeatQuantity(requestedSeats ?? DEFAULT_SEATS) : 1;

  // Same "mint a one-off discounted Razorpay Plan" mechanism
  // createRazorpayCheckoutForCompany uses for a fresh checkout — a
  // Razorpay Subscription always bills against a real Plan object with a
  // fixed price, so a coupon applied here needs its own discounted Plan
  // too, not just a number changed on our side. Same rule as checkout: a
  // coupon only ever discounts the plain monthly price, never stacked with
  // an already-discounted commitment tier — and, same as checkout, against
  // the whole seat-multiplied total once (never once per seat), then
  // divided back to a per-seat Plan price.
  let couponId = null;
  let discountAmount = 0;
  let razorpayPlanId;
  if (couponCode && months > 1) {
    const e = new Error("Coupons can only be applied to monthly billing, not a multi-month commitment plan."); e.status = 400; throw e;
  } else if (couponCode && couponsAvailable) {
    const baseTotal = Number(newPlan.price) * seatQuantity;
    const validated = await validateCouponForPlan(couponCode, newPlan, baseTotal);
    couponId = validated.coupon.id;
    discountAmount = validated.discountAmount;
    const perSeatFinal = Math.round((validated.finalAmount / seatQuantity) * 100) / 100;
    razorpayPlanId = await createRazorpayPlan({ ...newPlan, price: perSeatFinal });
  } else if (couponCode && !couponsAvailable) {
    const e = new Error("Coupons aren't available yet."); e.status = 404; throw e;
  } else if (tier) {
    razorpayPlanId = await ensureDurationRazorpayPlanId(newPlan, tier);
  } else {
    razorpayPlanId = await ensureRazorpayPlanId(newPlan);
  }

  await updateRazorpaySubscription(existing.gateway_subscription_id, { razorpayPlanId, quantity: seatQuantity, scheduleChangeAt: when }).catch(rethrowIfUpiPlanChangeRestriction);

  // Legacy cleanup only — see doc comment above.
  if (tieredReady && existing.maintenance_gateway_subscription_id) {
    await cancelRazorpaySubscription(existing.maintenance_gateway_subscription_id, when === "cycle_end").catch((err) => {
      console.error("Old maintenance subscription cancellation not completed:", err.message);
    });
  }

  const pendingColumnReady = await hasPendingPlanIdColumn();
  const couponColumns = couponsAvailable ? [couponId, couponId ? discountAmount : null] : [];

  if (when === "now") {
    await pool.query(
      `UPDATE company_subscriptions SET plan_id=?${pendingColumnReady ? ", pending_plan_id=NULL" : ""}${tieredReady ? ", maintenance_gateway_subscription_id=NULL, seat_quantity=?" : ""}${commitmentColumnReady ? ", commitment_months=?" : ""}${couponsAvailable ? ", coupon_id=?, coupon_discount_amount=?" : ""} WHERE id=?`,
      [newPlanId, ...(tieredReady ? [seatQuantity] : []), ...(commitmentColumnReady ? [months] : []), ...couponColumns, existing.id]
    );
    const conn = await pool.getConnection();
    try { await syncCompanyModulesToPlan(conn, session.company_id, newPlanId, session.id); } finally { conn.release(); }
  } else if (pendingColumnReady) {
    // Local plan_id is deliberately left untouched here — the company
    // keeps its current plan's limits/features until Razorpay actually
    // applies the change at cycle end, which arrives back through the
    // normal subscription.charged/updated webhook (see the reconciliation
    // in confirmRazorpaySubscription below). coupon_id/coupon_discount_amount
    // ARE set now though, so whenever that future payment actually lands,
    // the existing webhook-driven redeemCoupon() call picks it up correctly.
    // seat_quantity is ALSO set now (not deferred) — Razorpay itself is
    // already told the new quantity via scheduleChangeAt="cycle_end" above,
    // so our own record should match what will actually bill, not the old
    // count, even before the switch visibly takes effect locally.
    await pool.query(
      `UPDATE company_subscriptions SET pending_plan_id=?${tieredReady ? ", seat_quantity=?" : ""}${commitmentColumnReady ? ", commitment_months=?" : ""}${couponsAvailable ? ", coupon_id=?, coupon_discount_amount=?" : ""} WHERE id=?`,
      [newPlanId, ...(tieredReady ? [seatQuantity] : []), ...(commitmentColumnReady ? [months] : []), ...couponColumns, existing.id]
    );
  }

  await logActivity({ userId: session.id, module: "platform", action: "razorpay_plan_change_scheduled", entityType: "company_subscription", entityId: existing.id, companyId: session.company_id, description: `${session.name} ${when === "now" ? "switched" : "scheduled a switch"} to plan "${newPlan.name}"${when === "cycle_end" ? ` (effective ${existing.ends_at})` : ""}${couponId ? " with a coupon" : ""}${tier ? ` (${months}-month commitment)` : ""}` }).catch(() => {});

  return { planName: newPlan.name, when, effectiveAt: when === "cycle_end" ? existing.ends_at : null };
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
        const seats = row.seat_quantity || 1;
        // A multi-month commitment tier bills tier.price × its own
        // duration_months per cycle, not the plan's plain 1-month price —
        // reconstruct that same cycle amount here so the recorded/invoiced
        // amount matches what was actually charged, not just the 1-month rate.
        let cycleBase = Number(plan.price);
        if (row.commitment_months > 1) {
          const [[tier]] = await pool.query(`SELECT price FROM plan_duration_prices WHERE plan_id=? AND duration_months=?`, [planId, row.commitment_months]);
          if (tier) cycleBase = Number(tier.price) * row.commitment_months;
        }
        const subtotal = Math.max(0, cycleBase * seats - Number(row.coupon_discount_amount || 0));
        const chargedAmount = withGst(subtotal);
        await recordSubscriptionPayment({
          companyId: row.company_id, subscriptionId: row.id, planId, gateway: "razorpay",
          amount: chargedAmount.toFixed(2), currency: plan.currency || "INR",
          gatewayTransactionId: paymentId, gatewaySubscriptionId: razorpaySubscriptionId, status: "completed",
          seatQuantity: seats, gstAmount: gstAmount(subtotal),
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

/** Looks a Razorpay subscription id up against the company's subscription
 * row — a webhook event just carries a bare subscription id. */
async function findSubscriptionRowByRazorpayId(razorpaySubscriptionId) {
  const [[row]] = await pool.query(
    `SELECT * FROM company_subscriptions WHERE gateway='razorpay' AND gateway_subscription_id = ? LIMIT 1`,
    [razorpaySubscriptionId]
  );
  return row || null;
}

async function handleRazorpayPaymentFailed(payload) {
  const razorpaySubscriptionId = payload.payment?.entity?.subscription_id || payload.subscription?.entity?.id;
  if (!razorpaySubscriptionId) return;
  const row = await findSubscriptionRowByRazorpayId(razorpaySubscriptionId);
  if (!row) return;

  const [[plan]] = await pool.query(`SELECT name FROM plans WHERE id=?`, [row.plan_id]);
  await pool.query(`UPDATE company_subscriptions SET status='past_due' WHERE id=?`, [row.id]);

  const [admins] = await pool.query(`SELECT id, email FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [row.company_id]);
  for (const admin of admins) {
    await createNotification(row.company_id, admin.id, {
      title: "Payment failed",
      message: `Your "${plan?.name}" subscription payment failed. Please update your payment method with Razorpay.`,
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

  // The amount here is Razorpay's own report of what was actually
  // captured — the one number in this whole file that's never computed
  // locally. GST is back-derived from it (total = subtotal × 1.18) purely
  // for the invoice snapshot; it's not used to decide what to charge.
  const capturedTotal = (payment.amount || 0) / 100;
  await recordSubscriptionPayment({
    companyId: row.company_id, subscriptionId: row.id, planId: row.plan_id, gateway: "razorpay",
    amount: capturedTotal, currency: payment.currency || "INR",
    seatQuantity: row.seat_quantity || null, gstAmount: Math.round((capturedTotal - capturedTotal / (1 + GST_RATE)) * 100) / 100,
    gatewayTransactionId: payment.id, gatewayOrderId: payment.order_id || null, gatewaySubscriptionId: razorpaySubscriptionId, status: "completed",
  });

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
        await confirmRazorpaySubscription(subId);
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
