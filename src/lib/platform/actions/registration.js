import "server-only";
import { pool } from "@/lib/db";
import { provisionCompany } from "@/lib/platform/actions/provisioning";
import { createPayPalCheckoutForCompany } from "@/lib/platform/actions/paypalBilling";
import { createRazorpayCheckoutForCompany } from "@/lib/platform/actions/razorpayBilling";
import { hasPlanDescriptionColumn, hasPlanPayPalColumns, hasPlanRazorpayColumns } from "@/lib/db/schemaFlags";

/** Public-safe plan list for the registration/pricing flow — active plans
 * only, no internal-only fields. `description` only selected once the
 * migration adding it has run (see schemaFlags.js) — this is a public,
 * currently-working page, so it must never 500 ahead of that migration.
 * Exposes only WHETHER each gateway is connected (hasPayPal/hasRazorpay),
 * never the actual gateway plan ids — the registration UI needs to know
 * which payment method(s) to offer for a given plan, nothing more. */
export async function listPublicPlans() {
  const [withDescription, withPayPal, withRazorpay] = await Promise.all([hasPlanDescriptionColumn(), hasPlanPayPalColumns(), hasPlanRazorpayColumns()]);
  const [rows] = await pool.query(
    `SELECT id, name, slug${withDescription ? ", description" : ""}, billing_cycle, price, currency, trial_days, max_users, max_leads, max_storage_mb
     ${withPayPal ? ", (paypal_plan_id IS NOT NULL) AS hasPayPal" : ", 0 AS hasPayPal"}
     ${withRazorpay ? ", (razorpay_plan_id IS NOT NULL) AS hasRazorpay" : ", 0 AS hasRazorpay"}
     FROM plans WHERE status = 'active' ORDER BY price IS NULL DESC, price ASC`
  );
  return rows.map((r) => ({ ...r, hasPayPal: !!r.hasPayPal, hasRazorpay: !!r.hasRazorpay }));
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

  // SELECT * (not named columns) — paypal_plan_id/razorpay_plan_id may not
  // exist yet on this environment (see schemaFlags.js); when they don't,
  // plan.paypal_plan_id/plan.razorpay_plan_id are simply undefined, which
  // correctly falls through the requiresPayment check below exactly as if
  // neither gateway were connected — never a crash.
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ? AND status = 'active'`, [planId]);
  if (!plan) { const e = new Error("Selected plan is not available."); e.status = 400; throw e; }

  const [[existingCompany]] = await pool.query(`SELECT id FROM companies WHERE LOWER(name) = LOWER(?) LIMIT 1`, [companyName.trim()]);
  if (existingCompany) { const e = new Error("A company with this name is already registered."); e.status = 409; throw e; }

  const requiresPayment = plan.price && Number(plan.price) > 0 && plan.billing_cycle !== "trial";

  // A plan is only ever synced to whichever currency-appropriate gateway(s)
  // it belongs to — never assume PayPal. If both are connected, the client
  // must say which one the registrant picked; if only one is, that one is
  // used regardless of what (or whether) the client sent.
  let gateway = null;
  if (requiresPayment) {
    const hasPayPal = !!plan.paypal_plan_id;
    const hasRazorpay = !!plan.razorpay_plan_id;
    if (!hasPayPal && !hasRazorpay) {
      const e = new Error("This plan requires payment, but hasn't been connected to a payment gateway yet. Please contact us to get started.");
      e.status = 409;
      throw e;
    }
    if (hasPayPal && hasRazorpay) {
      if (!["paypal", "razorpay"].includes(input.gateway)) { const e = new Error("Please choose a payment method."); e.status = 400; throw e; }
      gateway = input.gateway;
    } else {
      gateway = hasPayPal ? "paypal" : "razorpay";
    }
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

  if (requiresPayment && gateway === "paypal") {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const { approveUrl } = await createPayPalCheckoutForCompany({
      companyId: result.companyId,
      planId: plan.id,
      subscriberEmail: adminEmail.trim().toLowerCase(),
      subscriberName: adminName.trim(),
      returnUrl: `${appUrl}/register/confirm`,
      cancelUrl: `${appUrl}/login?checkout=cancelled`,
    });
    return { companyId: result.companyId, companyName: companyName.trim(), planName: plan.name, requiresPayment: true, gateway: "paypal", approveUrl };
  }

  if (requiresPayment && gateway === "razorpay") {
    const { razorpaySubscriptionId, razorpayKeyId, amount, currency } = await createRazorpayCheckoutForCompany({
      companyId: result.companyId,
      planId: plan.id,
      subscriberEmail: adminEmail.trim().toLowerCase(),
      subscriberName: adminName.trim(),
    });
    return {
      companyId: result.companyId, companyName: companyName.trim(), planName: plan.name, requiresPayment: true, gateway: "razorpay",
      razorpaySubscriptionId, razorpayKeyId, amount, currency,
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
