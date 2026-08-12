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
export async function getSubscriptionState(companyId) {
  const [[sub]] = await pool.query(
    `SELECT cs.*, p.name AS plan_name FROM company_subscriptions cs JOIN plans p ON p.id = cs.plan_id
     WHERE cs.company_id = ? ORDER BY cs.created_at DESC LIMIT 1`, [companyId]
  );
  if (!sub) return "no_subscription";
  if (sub.status === "cancelled") return "cancelled";
  if (sub.ends_at && new Date(sub.ends_at) < new Date()) return "expired";
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
  // plans has no max_leads column (verified against live schema) — lead
  // limits are explicitly optional per spec ("if the existing architecture
  // supports it"), and it doesn't yet, so this reports what's real rather
  // than inventing a limit that isn't actually enforced anywhere.
  const [[sub]] = await pool.query(
    `SELECT cs.*, p.name AS plan_name, p.max_storage_mb, p.max_users
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

  return {
    hasSubscription: true,
    blocked: state === "expired" || state === "cancelled",
    state,
    subscriptionId: sub.id,
    planName: sub.plan_name,
    maxStorageMb: sub.max_storage_mb,
    maxUsers: sub.max_users,
    startsAt: sub.starts_at,
    endsAt: sub.ends_at,
    daysRemaining,
  };
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