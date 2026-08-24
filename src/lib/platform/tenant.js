import "server-only";
import { pool } from "@/lib/db";

export function requireCompany(session) {
  if (!session?.company_id) { const e = new Error("No company context on this session."); e.status = 401; throw e; }
  return session.company_id;
}
export async function getEnabledModuleSlugs(companyId) {
  const [rows] = await pool.query(
    `SELECT m.slug FROM company_modules cm JOIN modules m ON m.id = cm.module_id
     WHERE cm.company_id = ? AND cm.enabled = 1 AND cm.licensed = 1 AND (cm.expires_at IS NULL OR cm.expires_at > NOW())`,
    [companyId]
  );
  return rows.map((r) => r.slug);
}
export async function isModuleEnabledForCompany(companyId, slug) {
  return (await getEnabledModuleSlugs(companyId)).includes(slug);
}

/** Server-side module gate for a specific feature (e.g. "payments") — the
 * real enforcement boundary. Hiding a nav link or a tab is UX only; this is
 * what actually blocks the API/page when a company's plan doesn't include
 * the module, independent of whatever permissions the user's role has. */
export async function assertModuleEnabled(companyId, slug) {
  if (!(await isModuleEnabledForCompany(companyId, slug))) {
    const e = new Error(`This feature isn't included in your company's current plan.`);
    e.status = 403;
    throw e;
  }
}
export async function getSubscriptionState(companyId) {
  const [[sub]] = await pool.query(
    `SELECT cs.*, p.name AS plan_name FROM company_subscriptions cs JOIN plans p ON p.id = cs.plan_id
     WHERE cs.company_id = ? ORDER BY cs.created_at DESC LIMIT 1`, [companyId]
  );
  if (!sub) return "no_subscription";
  if (sub.status === "cancelled") return "cancelled";
  if (sub.ends_at && new Date(sub.ends_at) < new Date()) return "expired";
  // Any other stored status (trial, pending, active, past_due, suspended,
  // payment_failed) passes through unchanged — pending/past_due/
  // payment_failed are deliberately NOT treated as expired/cancelled here:
  // a company mid-checkout or mid-payment-retry keeps whatever access it
  // already had until the payment gateway actually reports the subscription
  // cancelled/suspended/expired, per the "don't cut access over a transient
  // billing hiccup" requirement.
  return sub.status;
}

/**
 * The full picture behind getSubscriptionState's single word — plan name,
 * dates, days remaining, storage — for anywhere that needs to actually
 * display or reason about the subscription, not just gate on it.
 * `ends_at` is compared fresh against `new Date()` on every call, never
 * cached — the server is always the source of truth for whether a
 * subscription is still valid, per the tenant-cannot-bypass-by-changing-
 * client-state requirement this exists to satisfy.
 */
export async function getSubscriptionDetails(companyId) {
  const [[sub]] = await pool.query(
    `SELECT cs.*, p.name AS plan_name, p.price, p.currency, p.billing_cycle, p.trial_days, p.max_storage_mb, p.max_users, p.max_leads
     FROM company_subscriptions cs JOIN plans p ON p.id = cs.plan_id
     WHERE cs.company_id = ? ORDER BY cs.created_at DESC LIMIT 1`,
    [companyId]
  );
  if (!sub) return { hasSubscription: false, blocked: true, state: "no_subscription" };

  const now = new Date();
  const endsAt = sub.ends_at ? new Date(sub.ends_at) : null;
  const expiredByDate = endsAt ? endsAt < now : false;
  const state = sub.status === "cancelled" ? "cancelled" : expiredByDate ? "expired" : sub.status;
  const daysRemaining = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / 86400000) : null;

  // "suspended" (the gateway itself paused billing after repeated
  // failures) is treated the same as expired/cancelled — access blocked,
  // data untouched. "pending" (mid-checkout), "past_due"/"payment_failed"
  // (still within the gateway's own retry window) are deliberately NOT
  // blocked — a grace period, not an outage, per the standing "never
  // delete data / don't cut access over a transient billing hiccup"
  // requirement.
  return {
    hasSubscription: true,
    blocked: ["expired", "cancelled", "suspended"].includes(state),
    state,
    subscriptionId: sub.id,
    planId: sub.plan_id,
    gateway: sub.gateway,
    planName: sub.plan_name,
    price: sub.price,
    currency: sub.currency,
    billingCycle: sub.billing_cycle,
    trialDays: sub.trial_days,
    maxStorageMb: sub.max_storage_mb,
    maxUsers: sub.max_users,
    maxLeads: sub.max_leads,
    startsAt: sub.starts_at,
    endsAt: sub.ends_at,
    nextBillingAt: sub.next_billing_at,
    daysRemaining,
    isTrial: sub.status === "trial",
  };
}

/**
 * Server-side, pre-create gate for the leads.max_leads plan limit — mirrors
 * enforceStorageLimit's shape exactly (same null-means-unlimited convention,
 * same "count what's actually there" approach rather than trusting a cached
 * counter). Applies to every company on every lead creation — not just
 * newly registered ones — since it's evaluated fresh against the company's
 * current subscription every time, not seeded once at signup.
 */
export async function enforceLeadLimit(companyId) {
  const [[plan]] = await pool.query(
    `SELECT p.max_leads FROM company_subscriptions cs JOIN plans p ON p.id = cs.plan_id
     WHERE cs.company_id = ? ORDER BY cs.created_at DESC LIMIT 1`,
    [companyId]
  );
  if (!plan?.max_leads) return; // no subscription row, or unlimited

  const [[{ count }]] = await pool.query(`SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND is_deleted = 0`, [companyId]);
  if (count >= plan.max_leads) {
    const e = new Error(`This plan's lead limit (${plan.max_leads}) has been reached. Upgrade the plan to add more leads.`);
    e.status = 403;
    throw e;
  }
}

/** Real counts, computed fresh — same "count what's actually there" pattern
 * as enforceStorageLimit/enforceLeadLimit, not a cached/stale counter. */
export async function getUsageCounts(companyId) {
  const [[{ userCount }]] = await pool.query(`SELECT COUNT(*) AS userCount FROM users WHERE company_id = ? AND is_deleted = 0`, [companyId]);
  const [[{ leadCount }]] = await pool.query(`SELECT COUNT(*) AS leadCount FROM leads WHERE company_id = ? AND is_deleted = 0`, [companyId]);
  return { userCount, leadCount };
}

export async function getCurrentCompany(companyId) {
  const [[company]] = await pool.query(
    `
      SELECT *
      FROM companies
      WHERE id = ?
      LIMIT 1
    `,
    [companyId]
  );

  if (!company) {
    const err = new Error("Company not found.");
    err.status = 404;
    throw err;
  }

  return company;
}