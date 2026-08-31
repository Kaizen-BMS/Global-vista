import "server-only";
import { pool } from "@/lib/db";
import { provisionCompany } from "@/lib/platform/actions/provisioning";
import { createBillDeskCheckoutForCompany } from "@/lib/platform/actions/billdeskBilling";
import { createRazorpayCheckoutForCompany } from "@/lib/platform/actions/razorpayBilling";
import { validateCouponForPlan } from "@/lib/platform/actions/coupons";
import { getBillDeskStatus } from "@/lib/payments/billdeskClient";
import { hasPlanDescriptionColumn, hasCouponsSchema, hasPlanRazorpayColumns, hasTieredPlansSchema } from "@/lib/db/schemaFlags";
import { listPublicDurationPrices } from "@/lib/platform/actions/planDurationPricing";

/** Public-safe plan list for the registration/pricing flow — active plans
 * only, no internal-only fields. `description` only selected once the
 * migration adding it has run (see schemaFlags.js) — this is a public,
 * currently-working page, so it must never 500 ahead of that migration.
 * `hasRazorpay` exposes only WHETHER this specific plan is connected to
 * Razorpay (never the actual gateway plan id) — BillDesk's availability is
 * platform-wide (not per-plan), reported separately via billDeskAvailable
 * so the registration UI knows which payment method(s) to offer. */
export async function listPublicPlans() {
  const [withDescription, withRazorpay, withTiers] = await Promise.all([hasPlanDescriptionColumn(), hasPlanRazorpayColumns(), hasTieredPlansSchema()]);
  const [rows] = await pool.query(
    `SELECT id, name, slug${withDescription ? ", description" : ""}, billing_cycle, price, currency, trial_days, max_users, max_leads, max_storage_mb
     ${withRazorpay ? ", (razorpay_plan_id IS NOT NULL) AS hasRazorpay" : ", 0 AS hasRazorpay"}
     ${withTiers ? ", pricing_model, maintenance_annual_fee, registration_label, development_cost_label, installation_cost_label, allow_import_export" : ""}
     FROM plans WHERE status = 'active' ORDER BY price IS NULL DESC, price ASC`
  );
  const billDeskAvailable = getBillDeskStatus().configured;
  const durationTiersByPlan = await listPublicDurationPrices();
  return rows.map((r) => ({
    ...r, hasRazorpay: !!r.hasRazorpay, hasBillDesk: billDeskAvailable,
    pricing_model: r.pricing_model || "flat", allow_import_export: r.allow_import_export ?? 1,
    durationTiers: durationTiersByPlan[r.id] || [],
  }));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public self-service registration. Thin validation + orchestration layer
 * over provisionCompany — the actual company/role/admin/subscription
 * creation logic is NOT duplicated here, it's the exact same transactional
 * engine the Platform Console's own "create company" wizard uses, just
 * invoked with operatorId=null (nobody on the platform side initiated
 * this) and a registrant-supplied password instead of a generated one.
 */
export async function registerCompany(input) {
  const { companyName, adminName, adminEmail, adminPassword, confirmPassword, planId } = input;

  if (!companyName || !companyName.trim()) { const e = new Error("Company name is required."); e.status = 400; throw e; }
  if (!adminName || !adminName.trim()) { const e = new Error("Your name is required."); e.status = 400; throw e; }
  if (!adminEmail || !EMAIL_RE.test(adminEmail)) { const e = new Error("A valid email address is required."); e.status = 400; throw e; }
  if (!adminPassword || adminPassword.length < 8) { const e = new Error("Password must be at least 8 characters."); e.status = 400; throw e; }
  if (adminPassword !== confirmPassword) { const e = new Error("Passwords do not match."); e.status = 400; throw e; }
  if (!planId) { const e = new Error("Please select a plan."); e.status = 400; throw e; }

  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ? AND status = 'active'`, [planId]);
  if (!plan) { const e = new Error("Selected plan is not available."); e.status = 400; throw e; }

  const [[existingCompany]] = await pool.query(`SELECT id FROM companies WHERE LOWER(name) = LOWER(?) LIMIT 1`, [companyName.trim()]);
  if (existingCompany) { const e = new Error("A company with this name is already registered."); e.status = 409; throw e; }

  const requiresPayment = plan.price && Number(plan.price) > 0 && plan.billing_cycle !== "trial";

  // BillDesk's availability is platform-wide; Razorpay's is per-plan (the
  // plan must already be synced to a real Razorpay Plan — see
  // syncPlanToRazorpay). If both are available, the client must say which
  // one the registrant picked; if only one is, that one is used regardless
  // of what (or whether) the client sent.
  let gateway = null;
  if (requiresPayment) {
    const billDeskAvailable = getBillDeskStatus().configured;
    const razorpayAvailable = !!plan.razorpay_plan_id;
    if (!billDeskAvailable && !razorpayAvailable) {
      const e = new Error("Payment is required for this plan, but no payment gateway is configured yet. Please contact us to get started.");
      e.status = 409;
      throw e;
    }
    if (billDeskAvailable && razorpayAvailable) {
      if (!["billdesk", "razorpay"].includes(input.gateway)) { const e = new Error("Please choose a payment method."); e.status = 400; throw e; }
      gateway = input.gateway;
    } else {
      gateway = billDeskAvailable ? "billdesk" : "razorpay";
    }
  }

  // Fail fast on a bad coupon code BEFORE the company/admin account is
  // created — the checkout-creation calls below re-validate it again later,
  // but catching a typo here avoids leaving a "pending" company behind for
  // something the user can just fix and resubmit.
  if (requiresPayment && input.couponCode && (await hasCouponsSchema())) {
    await validateCouponForPlan(input.couponCode, plan);
  }

  // Paid plan: the company + admin account are created NOW (so the admin
  // can log in immediately) but with subscriptionStatus="pending" — this
  // deliberately does NOT grant any modules (see provisionCompany's guard
  // on subscriptionStatus==="pending"). Nothing is "active" until the
  // gateway confirms the subscription server-side, per the standing "never
  // activate a paid subscription merely because the form was submitted" rule.
  const result = await provisionCompany(
    {
      companyName: companyName.trim(),
      companyEmail: input.companyEmail || null,
      companyPhone: input.companyPhone || null,
      companyAddress: [input.companyAddress, input.companyCity, input.companyState].filter(Boolean).join(", ") || null,
      companyCountry: input.companyCountry || null,
      companyWebsite: input.companyWebsite || null,
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim().toLowerCase(),
      adminPhone: input.adminPhone || null,
      adminPassword,
      planId: plan.id,
      subscriptionStatus: requiresPayment ? "pending" : "trial",
    },
    null
  );

  if (requiresPayment && gateway === "billdesk") {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const { checkoutUrl } = await createBillDeskCheckoutForCompany({
      companyId: result.companyId,
      planId: plan.id,
      subscriberEmail: adminEmail.trim().toLowerCase(),
      subscriberName: adminName.trim(),
      returnUrl: `${appUrl}/register/confirm`,
      couponCode: input.couponCode || null,
    });
    return { companyId: result.companyId, companyName: companyName.trim(), planName: plan.name, requiresPayment: true, gateway: "billdesk", checkoutUrl };
  }

  if (requiresPayment && gateway === "razorpay") {
    const { razorpaySubscriptionId, razorpayKeyId, amount, currency, maintenanceRazorpaySubscriptionId, maintenanceAmount, seatQuantity, totalAmount } = await createRazorpayCheckoutForCompany({
      companyId: result.companyId,
      planId: plan.id,
      subscriberEmail: adminEmail.trim().toLowerCase(),
      subscriberName: adminName.trim(),
      couponCode: input.couponCode || null,
      durationMonths: input.durationMonths || 1,
    });
    return {
      companyId: result.companyId, companyName: companyName.trim(), planName: plan.name, requiresPayment: true, gateway: "razorpay",
      razorpaySubscriptionId, razorpayKeyId, amount, currency, maintenanceRazorpaySubscriptionId, maintenanceAmount, seatQuantity, totalAmount,
    };
  }

  const [[subscription]] = await pool.query(
    `SELECT starts_at, ends_at FROM company_subscriptions WHERE company_id = ? ORDER BY created_at DESC LIMIT 1`,
    [result.companyId]
  );
  const daysRemaining = subscription?.ends_at ? Math.max(0, Math.ceil((new Date(subscription.ends_at).getTime() - Date.now()) / 86400000)) : null;

  return {
    companyId: result.companyId,
    companyName: companyName.trim(),
    planName: plan.name,
    requiresPayment: false,
    trialStart: subscription?.starts_at || null,
    trialEnd: subscription?.ends_at || null,
    daysRemaining,
  };
}
