import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { hasPlanDescriptionColumn, hasPlanPayPalColumns, hasPlanRazorpayColumns, hasCompanySubscriptionsGatewayColumns, hasSubscriptionPaymentsTable } from "@/lib/db/schemaFlags";

/** One row per company — its most recent subscription, joined with plan,
 * storage usage, user count, and lead count for the Platform Console table.
 * `gateway` is only selected once the billing migration has landed — see
 * schemaFlags.js; this is a page-load path and must never 500 ahead of it. */
export async function listSubscriptions() {
  const withGateway = await hasCompanySubscriptionsGatewayColumns();
  const [rows] = await pool.query(`
    SELECT
      c.id AS company_id, c.name AS company_name, c.status AS company_status,
      cs.id AS subscription_id, cs.status AS subscription_status, cs.starts_at, cs.ends_at,
      ${withGateway ? "cs.gateway," : "'manual' AS gateway,"}
      p.id AS plan_id, p.name AS plan_name, p.max_storage_mb, p.max_users, p.max_leads,
      (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.is_deleted = 0) AS user_count,
      (SELECT COUNT(*) FROM leads l WHERE l.company_id = c.id AND l.is_deleted = 0) AS lead_count,
      COALESCE((SELECT SUM(file_size) FROM employee_documents ed WHERE ed.company_id = c.id AND ed.is_deleted = 0), 0) +
      COALESCE((SELECT SUM(file_size) FROM lead_documents ld WHERE ld.company_id = c.id), 0) AS storage_bytes
    FROM companies c
    LEFT JOIN company_subscriptions cs ON cs.id = (
      SELECT id FROM company_subscriptions WHERE company_id = c.id ORDER BY created_at DESC LIMIT 1
    )
    LEFT JOIN plans p ON p.id = cs.plan_id
    ORDER BY c.created_at DESC
  `);

  const now = new Date();
  return rows.map((r) => {
    const endsAt = r.ends_at ? new Date(r.ends_at) : null;
    const daysRemaining = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / 86400000) : null;
    let state;
    if (r.company_status === "suspended") state = "suspended";
    else if (r.company_status === "deleted") state = "deleted";
    else if (!r.subscription_id) state = "no_subscription";
    else if (r.subscription_status === "cancelled") state = "cancelled";
    else if (endsAt && endsAt < now) state = "expired";
    else if (daysRemaining != null && daysRemaining <= 7) state = "expiring_soon";
    else state = r.subscription_status;
    return { ...r, daysRemaining, state };
  });
}

export async function listPlansForAdmin() {
  const [rows] = await pool.query(`SELECT * FROM plans ORDER BY max_storage_mb IS NULL, max_storage_mb ASC, name ASC`);
  return rows;
}

export async function getPlanModuleIds(planId) {
  const [rows] = await pool.query(`SELECT module_id FROM plan_modules WHERE plan_id = ?`, [planId]);
  return rows.map((r) => r.module_id);
}

/** One query for every plan's module assignments, grouped — avoids N+1 when
 * rendering the Plans manager's module checklist for every plan at once. */
export async function listAllPlanModules() {
  const [rows] = await pool.query(`SELECT plan_id, module_id FROM plan_modules`);
  const byPlan = {};
  for (const r of rows) { (byPlan[r.plan_id] ||= []).push(r.module_id); }
  return byPlan;
}

/** Full reconciliation, not additive — Platform Operator explicitly setting
 * a plan's module list means exactly that list, nothing more/less. */
export async function setPlanModules(planId, moduleIds, operatorId) {
  const ids = Array.isArray(moduleIds) ? moduleIds.map(Number).filter(Boolean) : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM plan_modules WHERE plan_id = ?`, [planId]);
    if (ids.length) {
      await conn.query(`INSERT INTO plan_modules (plan_id, module_id) VALUES ?`, [ids.map((id) => [planId, id])]);
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
  await logActivity({ userId: operatorId, module: "platform", action: "plan_modules_updated", entityType: "plan", entityId: planId, description: `Set plan modules (${ids.length})` }).catch(() => {});
}

/**
 * Reconciles a company's `company_modules` to exactly match a plan's
 * `plan_modules` — enables what the plan grants, disables what it doesn't.
 * Used at provisioning (new company) and on an explicit plan change
 * (existing company) — both deliberate, operator-or-registrant-initiated
 * moments, never a silent background sweep. Modules with no plan_modules
 * row at all (plan_modules empty) mean "not module-gated for this plan" —
 * left alone, so a plan that hasn't configured module assignment yet
 * doesn't suddenly strip every company on it down to nothing.
 */
async function syncCompanyModulesToPlan(conn, companyId, planId, actorId) {
  const [planModuleRows] = await conn.query(`SELECT module_id FROM plan_modules WHERE plan_id = ?`, [planId]);
  if (planModuleRows.length === 0) return; // plan has no explicit module list configured — don't touch company_modules
  const grantedIds = planModuleRows.map((r) => r.module_id);

  const [existingRows] = await conn.query(`SELECT module_id, enabled FROM company_modules WHERE company_id = ?`, [companyId]);
  const existingIds = new Set(existingRows.map((r) => r.module_id));

  for (const moduleId of grantedIds) {
    if (existingIds.has(moduleId)) {
      await conn.query(`UPDATE company_modules SET enabled = 1, licensed = 1 WHERE company_id = ? AND module_id = ?`, [companyId, moduleId]);
    } else {
      await conn.query(`INSERT INTO company_modules (company_id, module_id, enabled, licensed, enabled_by) VALUES (?, ?, 1, 1, ?)`, [companyId, moduleId, actorId || null]);
    }
  }
  const grantedSet = new Set(grantedIds);
  for (const row of existingRows) {
    if (!grantedSet.has(row.module_id) && row.enabled) {
      await conn.query(`UPDATE company_modules SET enabled = 0 WHERE company_id = ? AND module_id = ?`, [companyId, row.module_id]);
    }
  }
}
export { syncCompanyModulesToPlan };

// Plan CRUD is platform-wide configuration, not tied to any one company —
// logActivity requires a real company_id (by design, so tenant activity
// logs can never leak a null/cross-tenant row), which genuinely doesn't
// exist for this event. Not on the spec's required audit-event list
// either (that list is about a COMPANY's subscription/plan changing,
// which changeSubscriptionPlan below does log correctly).
// createPlan branches on whether the plans.description migration has
// landed yet — see schemaFlags.js. Until it has, this runs the exact INSERT
// shape that already works in production today; the description field
// activates automatically, with no redeploy, the moment the migration is
// applied.
export async function createPlan(data) {
  const slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const withDescription = await hasPlanDescriptionColumn();
  const [result] = await pool.query(
    withDescription
      ? `INSERT INTO plans (name, slug, description, billing_cycle, price, currency, trial_days, max_users, max_leads, max_storage_mb, max_api_calls_per_day, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      : `INSERT INTO plans (name, slug, billing_cycle, price, currency, trial_days, max_users, max_leads, max_storage_mb, max_api_calls_per_day, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    withDescription
      ? [data.name, slug, data.description || null, data.billingCycle || "monthly", data.price || null, data.currency || "INR", data.trialDays || null, data.maxUsers || null, data.maxLeads || null, data.maxStorageMb || null, data.maxApiCallsPerDay || null, data.status || "active"]
      : [data.name, slug, data.billingCycle || "monthly", data.price || null, data.currency || "INR", data.trialDays || null, data.maxUsers || null, data.maxLeads || null, data.maxStorageMb || null, data.maxApiCallsPerDay || null, data.status || "active"]
  );
  return result.insertId;
}

/**
 * A plan referenced by any company's subscription history (current or past)
 * can never be hard-deleted — that would either violate the FK constraint
 * outright or, worse, silently orphan real billing history. In that case
 * this archives it instead (status='inactive', hidden from self-service
 * registration and the "assign a plan" pickers, per listPublicPlans'
 * status='active' filter) and reports that back so the UI can explain why
 * a "Delete" click didn't remove the row. Only a plan nobody has ever been
 * on is actually deleted, along with its now-orphaned plan_modules rows.
 */
export async function deletePlan(id, operatorId) {
  const [[plan]] = await pool.query(`SELECT * FROM plans WHERE id = ?`, [id]);
  if (!plan) { const e = new Error("Plan not found."); e.status = 404; throw e; }

  const [[subCount]] = await pool.query(`SELECT COUNT(*) AS n FROM company_subscriptions WHERE plan_id = ?`, [id]);
  const paymentsExist = await hasSubscriptionPaymentsTable();
  const [[payCount]] = paymentsExist
    ? await pool.query(`SELECT COUNT(*) AS n FROM subscription_payments WHERE plan_id = ?`, [id])
    : [{ n: 0 }];
  const inUse = Number(subCount.n) > 0 || Number(payCount.n) > 0;

  if (inUse) {
    await pool.query(`UPDATE plans SET status = 'inactive' WHERE id = ?`, [id]);
    await logActivity({ userId: operatorId, module: "platform", action: "plan_archived", entityType: "plan", entityId: id, description: `Archived plan "${plan.name}" — ${subCount.n} company subscription(s) reference it, so it can't be deleted.` }).catch(() => {});
    return { deleted: false, archived: true, companiesUsingIt: Number(subCount.n) };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM plan_modules WHERE plan_id = ?`, [id]);
    await conn.query(`DELETE FROM plans WHERE id = ?`, [id]);
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }

  await logActivity({ userId: operatorId, module: "platform", action: "plan_deleted", entityType: "plan", entityId: id, description: `Deleted plan "${plan.name}"` }).catch(() => {});
  return { deleted: true, archived: false };
}

// Changing price/billing_cycle after a plan has already been synced to a
// gateway would silently desync what the gateway bills from what the DB
// says — a synced gateway plan is immutable on price/cycle by design, so
// instead of trying to update it in place, clear the linkage so the
// operator is prompted to re-sync (creating a fresh gateway plan) rather
// than the two silently drifting apart. paypal_plan_id/razorpay_plan_id are
// retained on `plans` purely for historical/audit traceability of rows that
// were synced before the PayPal/Razorpay retirement — no code still syncs
// to either.
export async function updatePlan(id, data) {
  const [withDescription, withPayPal, withRazorpay] = await Promise.all([hasPlanDescriptionColumn(), hasPlanPayPalColumns(), hasPlanRazorpayColumns()]);

  let paypalLinkCleared = false;
  let razorpayLinkCleared = false;
  if (withPayPal || withRazorpay) {
    const [[existing]] = await pool.query(`SELECT * FROM plans WHERE id=?`, [id]);
    const pricingChanged = Number(existing?.price) !== Number(data.price || 0) || existing?.billing_cycle !== (data.billingCycle || "monthly");
    paypalLinkCleared = !!(withPayPal && existing?.paypal_plan_id && pricingChanged);
    razorpayLinkCleared = !!(withRazorpay && existing?.razorpay_plan_id && pricingChanged);
  }

  const clearClauses = [paypalLinkCleared && "paypal_plan_id=NULL", razorpayLinkCleared && "razorpay_plan_id=NULL"].filter(Boolean).map((c) => `, ${c}`).join("");

  await pool.query(
    `UPDATE plans SET name=?${withDescription ? ", description=?" : ""}, billing_cycle=?, price=?, currency=?, trial_days=?, max_users=?, max_leads=?, max_storage_mb=?, max_api_calls_per_day=?, status=?${clearClauses} WHERE id=?`,
    [
      data.name, ...(withDescription ? [data.description || null] : []), data.billingCycle || "monthly", data.price || null, data.currency || "INR", data.trialDays || null,
      data.maxUsers || null, data.maxLeads || null, data.maxStorageMb || null, data.maxApiCallsPerDay || null, data.status || "active", id,
    ]
  );
  return { paypalLinkCleared, razorpayLinkCleared };
}

export async function getSubscriptionForCompany(companyId) {
  const [[sub]] = await pool.query(`SELECT * FROM company_subscriptions WHERE company_id=? ORDER BY created_at DESC LIMIT 1`, [companyId]);
  return sub || null;
}

async function recordHistory(conn, subscriptionId, event, fromPlanId, toPlanId, createdBy) {
  await conn.query(
    `INSERT INTO subscription_history (company_subscription_id, event, from_plan_id, to_plan_id, created_by) VALUES (?,?,?,?,?)`,
    [subscriptionId, event, fromPlanId || null, toPlanId || null, createdBy || null]
  );
}

/** Extend an existing subscription's expiry by N days from its current ends_at
 * (or from today, if it has none / already expired) — never from "now + N"
 * blindly, so extending an active subscription adds to what's left rather
 * than discarding remaining time. */
export async function extendSubscription(companyId, days, operatorId) {
  const sub = await getSubscriptionForCompany(companyId);
  if (!sub) { const e = new Error("This company has no subscription to extend."); e.status = 404; throw e; }

  const base = sub.ends_at && new Date(sub.ends_at) > new Date() ? new Date(sub.ends_at) : new Date();
  const newEndsAt = new Date(base.getTime() + days * 86400000);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE company_subscriptions SET ends_at=?, status='active' WHERE id=?`, [newEndsAt.toISOString().slice(0, 10), sub.id]);
    await recordHistory(conn, sub.id, "renewed", sub.plan_id, sub.plan_id, operatorId);
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }

  await logActivity({ userId: operatorId, module: "platform", action: "subscription_extended", entityType: "company_subscription", entityId: sub.id, description: `Extended by ${days} days — new expiry ${newEndsAt.toISOString().slice(0, 10)}`, companyId }).catch(() => {});
  return { newEndsAt: newEndsAt.toISOString().slice(0, 10) };
}

/** Set an explicit new expiry date (used by "Renew" with a picked date, as
 * opposed to Extend's relative +N days). */
export async function renewSubscription(companyId, newEndsAt, operatorId) {
  const sub = await getSubscriptionForCompany(companyId);
  if (!sub) { const e = new Error("This company has no subscription to renew."); e.status = 404; throw e; }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE company_subscriptions SET ends_at=?, status='active', cancelled_at=NULL WHERE id=?`, [newEndsAt, sub.id]);
    await recordHistory(conn, sub.id, "renewed", sub.plan_id, sub.plan_id, operatorId);
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }

  await logActivity({ userId: operatorId, module: "platform", action: "subscription_renewed", entityType: "company_subscription", entityId: sub.id, description: `Renewed — new expiry ${newEndsAt}`, companyId }).catch(() => {});

  const [operators] = await pool.query(`SELECT id, company_id FROM users WHERE is_platform_operator=1 AND is_deleted=0`);
  const [[company]] = await pool.query(`SELECT name FROM companies WHERE id=?`, [companyId]);
  for (const op of operators) {
    await createNotification(op.company_id, op.id, { title: "Subscription renewed", message: `${company?.name}'s subscription renewed to ${newEndsAt}`, type: "subscription_changed", link: `/platform/companies/${companyId}` }).catch(() => {});
  }
}

/** New storage limit applies immediately — files are never deleted, only
 * future uploads get gated by enforceStorageLimit reading the new plan. */
export async function changeSubscriptionPlan(companyId, newPlanId, operatorId) {
  const sub = await getSubscriptionForCompany(companyId);
  if (!sub) { const e = new Error("This company has no subscription."); e.status = 404; throw e; }
  const [[newPlan]] = await pool.query(`SELECT id, name, max_storage_mb FROM plans WHERE id=? AND status='active'`, [newPlanId]);
  if (!newPlan) { const e = new Error("Plan not found or inactive."); e.status = 404; throw e; }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE company_subscriptions SET plan_id=? WHERE id=?`, [newPlanId, sub.id]);
    await recordHistory(conn, sub.id, "plan_changed", sub.plan_id, newPlanId, operatorId);
    await syncCompanyModulesToPlan(conn, companyId, newPlanId, operatorId);
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }

  await logActivity({ userId: operatorId, module: "platform", action: "plan_changed", entityType: "company_subscription", entityId: sub.id, description: `Plan changed to "${newPlan.name}"`, companyId }).catch(() => {});

  let storageExceeded = false;
  if (newPlan.max_storage_mb) {
    const [[usage]] = await pool.query(
      `SELECT COALESCE((SELECT SUM(file_size) FROM employee_documents WHERE company_id=? AND is_deleted=0),0) +
              COALESCE((SELECT SUM(file_size) FROM lead_documents WHERE company_id=?),0) AS used_bytes`,
      [companyId, companyId]
    );
    storageExceeded = Number(usage.used_bytes) > newPlan.max_storage_mb * 1024 * 1024;
  }
  return { storageExceeded, planName: newPlan.name };
}

export async function cancelSubscription(companyId, operatorId) {
  const sub = await getSubscriptionForCompany(companyId);
  if (!sub) { const e = new Error("This company has no subscription."); e.status = 404; throw e; }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE company_subscriptions SET status='cancelled', cancelled_at=NOW() WHERE id=?`, [sub.id]);
    await recordHistory(conn, sub.id, "cancelled", sub.plan_id, sub.plan_id, operatorId);
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }

  await logActivity({ userId: operatorId, module: "platform", action: "subscription_cancelled", entityType: "company_subscription", entityId: sub.id, description: `Subscription cancelled`, companyId }).catch(() => {});
}
