import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { hasCouponsSchema } from "@/lib/db/schemaFlags";

function assertSchemaReady() {
  const e = new Error("The coupons schema hasn't been applied to this database yet."); e.status = 503; throw e;
}

function normalizeCode(code) {
  return (code || "").trim().toUpperCase().replace(/\s+/g, "");
}

function validateDiscount(discountType, discountValue) {
  if (discountType !== "percent" && discountType !== "fixed") { const e = new Error("Discount type must be 'percent' or 'fixed'."); e.status = 400; throw e; }
  const value = Number(discountValue);
  if (!(value > 0)) { const e = new Error("Discount value must be greater than 0."); e.status = 400; throw e; }
  if (discountType === "percent" && value > 100) { const e = new Error("A percentage discount can't exceed 100."); e.status = 400; throw e; }
  return value;
}

// ---------------------------------------------------------------------------
// Platform Operator — full CRUD
// ---------------------------------------------------------------------------

export async function listCouponsForAdmin() {
  if (!(await hasCouponsSchema())) return [];
  const [rows] = await pool.query(`SELECT * FROM coupons ORDER BY created_at DESC`);
  return rows;
}

export async function createCoupon(session, data) {
  assertPlatformOperator(session);
  if (!(await hasCouponsSchema())) assertSchemaReady();
  const code = normalizeCode(data.code);
  if (!code) { const e = new Error("Coupon code is required."); e.status = 400; throw e; }
  const discountValue = validateDiscount(data.discountType, data.discountValue);

  const [[existing]] = await pool.query(`SELECT id FROM coupons WHERE code = ?`, [code]);
  if (existing) { const e = new Error(`Coupon code "${code}" already exists.`); e.status = 409; throw e; }

  const [result] = await pool.query(
    `INSERT INTO coupons (code, discount_type, discount_value, max_redemptions, valid_from, valid_until, status, created_by)
     VALUES (?,?,?,?,?,?,?,?)`,
    [code, data.discountType, discountValue, data.maxRedemptions || null, data.validFrom || null, data.validUntil || null, data.status === "inactive" ? "inactive" : "active", session.id]
  );
  await logActivity({ userId: session.id, module: "platform", action: "coupon_created", entityType: "coupon", entityId: result.insertId, description: `Created coupon "${code}"` }).catch(() => {});
  return { id: result.insertId, code };
}

export async function updateCoupon(session, id, data) {
  assertPlatformOperator(session);
  if (!(await hasCouponsSchema())) assertSchemaReady();
  const [[existing]] = await pool.query(`SELECT * FROM coupons WHERE id = ?`, [id]);
  if (!existing) { const e = new Error("Coupon not found."); e.status = 404; throw e; }
  const discountValue = validateDiscount(data.discountType, data.discountValue);

  await pool.query(
    `UPDATE coupons SET discount_type=?, discount_value=?, max_redemptions=?, valid_from=?, valid_until=?, status=? WHERE id=?`,
    [data.discountType, discountValue, data.maxRedemptions || null, data.validFrom || null, data.validUntil || null, data.status === "inactive" ? "inactive" : "active", id]
  );
  await logActivity({ userId: session.id, module: "platform", action: "coupon_updated", entityType: "coupon", entityId: id, description: `Updated coupon "${existing.code}"` }).catch(() => {});
}

export async function deleteCoupon(session, id) {
  assertPlatformOperator(session);
  if (!(await hasCouponsSchema())) assertSchemaReady();
  const [[existing]] = await pool.query(`SELECT * FROM coupons WHERE id = ?`, [id]);
  if (!existing) { const e = new Error("Coupon not found."); e.status = 404; throw e; }
  if (existing.redemption_count > 0) {
    const e = new Error("This coupon has already been redeemed and can't be deleted — deactivate it instead to stop new use."); e.status = 409; throw e;
  }
  await pool.query(`DELETE FROM coupons WHERE id = ?`, [id]);
  await logActivity({ userId: session.id, module: "platform", action: "coupon_deleted", entityType: "coupon", entityId: id, description: `Deleted coupon "${existing.code}"` }).catch(() => {});
}

/** Which companies actually redeemed a coupon, newest first — the admin's
 * "used X / Y" count on the list already comes from coupons.redemption_count;
 * this is the drill-down into who those redemptions were. */
export async function listRedemptionsForCoupon(session, couponId) {
  assertPlatformOperator(session);
  if (!(await hasCouponsSchema())) return [];
  const [rows] = await pool.query(
    `SELECT r.id, r.company_id, c.name AS company_name, r.subscription_id, r.discount_amount, r.redeemed_at
     FROM coupon_redemptions r
     LEFT JOIN companies c ON c.id = r.company_id
     WHERE r.coupon_id = ?
     ORDER BY r.redeemed_at DESC`,
    [couponId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Checkout-time — validate a code against a specific plan's price, and
// record redemption once a payment for it actually completes.
// ---------------------------------------------------------------------------

/** Throws on any invalid/inactive/expired/exhausted coupon — callers decide
 * whether that should block checkout entirely or just proceed at full
 * price (see billdeskBilling.js, which treats a bad code as "no coupon"
 * rather than failing the whole checkout). */
export async function validateCouponForPlan(code, plan) {
  if (!(await hasCouponsSchema())) { const e = new Error("Coupons aren't available yet."); e.status = 404; throw e; }
  const normalized = normalizeCode(code);
  if (!normalized) { const e = new Error("Enter a coupon code."); e.status = 400; throw e; }

  const [[coupon]] = await pool.query(`SELECT * FROM coupons WHERE code = ?`, [normalized]);
  if (!coupon || coupon.status !== "active") { const e = new Error("Invalid or inactive coupon code."); e.status = 404; throw e; }

  const now = new Date();
  if (coupon.valid_from && now < new Date(coupon.valid_from)) { const e = new Error("This coupon isn't active yet."); e.status = 400; throw e; }
  if (coupon.valid_until && now > new Date(coupon.valid_until)) { const e = new Error("This coupon has expired."); e.status = 400; throw e; }
  if (coupon.max_redemptions != null && coupon.redemption_count >= coupon.max_redemptions) { const e = new Error("This coupon has reached its usage limit."); e.status = 400; throw e; }

  const price = Number(plan.price);
  let discountAmount = coupon.discount_type === "percent" ? (price * Number(coupon.discount_value)) / 100 : Number(coupon.discount_value);
  discountAmount = Math.min(Math.round(discountAmount * 100) / 100, price);
  const finalAmount = Math.round((price - discountAmount) * 100) / 100;

  return { coupon, discountAmount, finalAmount };
}

/** Idempotent — UNIQUE(subscription_id) on coupon_redemptions means a
 * second call for the same subscription (e.g. webhook + return-URL
 * confirmation both firing) no-ops instead of double-counting. */
export async function redeemCoupon({ couponId, companyId, subscriptionId, discountAmount }) {
  if (!couponId) return;
  if (!(await hasCouponsSchema())) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO coupon_redemptions (coupon_id, company_id, subscription_id, discount_amount) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE id = id`,
      [couponId, companyId, subscriptionId, discountAmount]
    );
    if (result.affectedRows === 1) {
      await conn.query(`UPDATE coupons SET redemption_count = redemption_count + 1 WHERE id = ?`, [couponId]);
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}
