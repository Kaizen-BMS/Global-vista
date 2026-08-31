import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { hasDurationPricingSchema } from "@/lib/db/schemaFlags";

function assertSchemaReady() {
  const e = new Error("Duration-based pricing isn't available yet — a pending database migration must be applied first."); e.status = 503; throw e;
}

// ---------------------------------------------------------------------------
// Platform Operator — full CRUD, per plan
// ---------------------------------------------------------------------------

export async function listDurationPricesForPlan(planId) {
  if (!(await hasDurationPricingSchema())) return [];
  const [rows] = await pool.query(`SELECT * FROM plan_duration_prices WHERE plan_id = ? ORDER BY duration_months ASC`, [planId]);
  return rows;
}

/** One query for every plan's duration tiers, grouped — mirrors
 * listAllPlanModules' shape, avoids an N+1 when rendering the Plans
 * manager's tier list for every plan at once. */
export async function listAllDurationPrices() {
  if (!(await hasDurationPricingSchema())) return {};
  const [rows] = await pool.query(`SELECT * FROM plan_duration_prices ORDER BY plan_id, duration_months ASC`);
  const byPlan = {};
  for (const r of rows) { (byPlan[r.plan_id] ||= []).push(r); }
  return byPlan;
}

/** Upsert — a tier is uniquely identified by (plan_id, duration_months), so
 * setting a price for a duration that already has one just updates it,
 * rather than requiring the caller to know the tier's row id. */
export async function setDurationPrice(session, planId, durationMonths, price, status = "active") {
  assertPlatformOperator(session);
  if (!(await hasDurationPricingSchema())) assertSchemaReady();
  const months = Number(durationMonths);
  const amount = Number(price);
  if (!(months > 0)) { const e = new Error("Duration must be a positive number of months."); e.status = 400; throw e; }
  if (!(amount > 0)) { const e = new Error("Price must be a positive number."); e.status = 400; throw e; }

  const [[plan]] = await pool.query(`SELECT id, name FROM plans WHERE id = ?`, [planId]);
  if (!plan) { const e = new Error("Plan not found."); e.status = 404; throw e; }

  await pool.query(
    `INSERT INTO plan_duration_prices (plan_id, duration_months, price, status) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE price = VALUES(price), status = VALUES(status), razorpay_plan_id = NULL`,
    [planId, months, amount, status === "inactive" ? "inactive" : "active"]
  );
  // razorpay_plan_id is deliberately cleared on every price change — a
  // Razorpay Plan's amount is immutable once created, so a changed price
  // needs a fresh Razorpay Plan the next time this tier is synced/used,
  // never the old (now wrong-priced) one silently reused.
  await logActivity({ userId: session.id, module: "platform", action: "plan_duration_price_set", entityType: "plan", entityId: planId, description: `Set ${months}-month price for "${plan.name}" to ${amount}/mo` }).catch(() => {});
}

export async function deleteDurationPrice(session, id) {
  assertPlatformOperator(session);
  if (!(await hasDurationPricingSchema())) assertSchemaReady();
  const [[existing]] = await pool.query(`SELECT plan_id, duration_months FROM plan_duration_prices WHERE id = ?`, [id]);
  if (!existing) { const e = new Error("Duration tier not found."); e.status = 404; throw e; }
  await pool.query(`DELETE FROM plan_duration_prices WHERE id = ?`, [id]);
  await logActivity({ userId: session.id, module: "platform", action: "plan_duration_price_deleted", entityType: "plan", entityId: existing.plan_id, description: `Removed ${existing.duration_months}-month tier` }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Public — active only
// ---------------------------------------------------------------------------

/** Every plan's active duration tiers, grouped by plan id, for the public
 * pricing/plan-picker UI. The implicit 1-month tier (plans.price) is NOT
 * included here — callers already have that from the plan row itself. */
export async function listPublicDurationPrices() {
  if (!(await hasDurationPricingSchema())) return {};
  const [rows] = await pool.query(`SELECT plan_id, duration_months, price FROM plan_duration_prices WHERE status = 'active' ORDER BY plan_id, duration_months ASC`);
  const byPlan = {};
  for (const r of rows) { (byPlan[r.plan_id] ||= []).push({ durationMonths: r.duration_months, price: r.price }); }
  return byPlan;
}
