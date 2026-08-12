import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";

/** One row per company — its most recent subscription, joined with plan,
 * storage usage, user count, and lead count for the Platform Console table. */
export async function listSubscriptions() {
  const [rows] = await pool.query(`
    SELECT
      c.id AS company_id, c.name AS company_name, c.status AS company_status,
      cs.id AS subscription_id, cs.status AS subscription_status, cs.starts_at, cs.ends_at,
      p.id AS plan_id, p.name AS plan_name, p.max_storage_mb, p.max_users,
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

// Plan CRUD is platform-wide configuration, not tied to any one company —
// logActivity requires a real company_id (by design, so tenant activity
// logs can never leak a null/cross-tenant row), which genuinely doesn't
// exist for this event. Not on the spec's required audit-event list
// either (that list is about a COMPANY's subscription/plan changing,
// which changeSubscriptionPlan below does log correctly).
export async function createPlan(data) {
  const slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const [result] = await pool.query(
    `INSERT INTO plans (name, slug, billing_cycle, max_users, max_storage_mb, max_api_calls_per_day, status) VALUES (?,?,?,?,?,?,?)`,
    [data.name, slug, data.billingCycle || "monthly", data.maxUsers || null, data.maxStorageMb || null, data.maxApiCallsPerDay || null, data.status || "active"]
  );
  return result.insertId;
}

export async function updatePlan(id, data) {
  await pool.query(
    `UPDATE plans SET name=?, billing_cycle=?, max_users=?, max_storage_mb=?, max_api_calls_per_day=?, status=? WHERE id=?`,
    [data.name, data.billingCycle || "monthly", data.maxUsers || null, data.maxStorageMb || null, data.maxApiCallsPerDay || null, data.status || "active", id]
  );
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
