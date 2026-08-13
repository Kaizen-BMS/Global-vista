import "server-only";
import { pool } from "@/lib/db";
import { provisionCompany } from "@/lib/platform/actions/provisioning";

/** Public-safe plan list for the registration/pricing flow — active plans
 * only, no internal-only fields. */
export async function listPublicPlans() {
  const [rows] = await pool.query(
    `SELECT id, name, slug, billing_cycle, price, currency, trial_days, max_users, max_leads, max_storage_mb
     FROM plans WHERE status = 'active' ORDER BY price IS NULL DESC, price ASC`
  );
  return rows;
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

  const [[plan]] = await pool.query(`SELECT id, name, price, trial_days, billing_cycle FROM plans WHERE id = ? AND status = 'active'`, [planId]);
  if (!plan) { const e = new Error("Selected plan is not available."); e.status = 400; throw e; }

  // A priced, non-trial plan needs real payment collection before a company
  // is created for it — PayPal isn't wired to actually charge anyone yet
  // (see src/lib/payments/providers.js: getPayPalStatus). Rather than
  // create the company and pretend payment happened, self-service signup
  // is only offered for plans that don't require payment up front.
  if (plan.price && Number(plan.price) > 0 && plan.billing_cycle !== "trial") {
    const e = new Error("This plan requires payment, which isn't available for self-service signup yet. Please contact us to get started on this plan.");
    e.status = 409;
    throw e;
  }

  const [[existingCompany]] = await pool.query(`SELECT id FROM companies WHERE LOWER(name) = LOWER(?) LIMIT 1`, [companyName.trim()]);
  if (existingCompany) { const e = new Error("A company with this name is already registered."); e.status = 409; throw e; }

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
      subscriptionStatus: "trial",
    },
    null
  );

  const [[subscription]] = await pool.query(
    `SELECT starts_at, ends_at FROM company_subscriptions WHERE company_id = ? ORDER BY created_at DESC LIMIT 1`,
    [result.companyId]
  );
  const daysRemaining = subscription?.ends_at ? Math.max(0, Math.ceil((new Date(subscription.ends_at).getTime() - Date.now()) / 86400000)) : null;

  return {
    companyId: result.companyId,
    companyName: companyName.trim(),
    planName: plan.name,
    trialStart: subscription?.starts_at || null,
    trialEnd: subscription?.ends_at || null,
    daysRemaining,
  };
}
