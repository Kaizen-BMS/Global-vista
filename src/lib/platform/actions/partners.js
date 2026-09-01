import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { hasPartnersSchema, hasCouponsSchema, hasSubscriptionPaymentsTable } from "@/lib/db/schemaFlags";
import { normalizeCode, validateDiscount } from "@/lib/platform/actions/coupons";

function assertSchemaReady() {
  const e = new Error("The partner program schema hasn't been applied to this database yet."); e.status = 503; throw e;
}

/**
 * Partner/affiliate program, built directly on top of the existing coupon
 * system rather than a second, parallel tracking mechanism: a partner's
 * referral code IS a real `coupons` row (tagged via coupons.partner_id),
 * so it works at checkout exactly like any other coupon already does —
 * "does applying it actually work" was already solid (see coupons.js);
 * what was missing was attribution — knowing WHICH influencer a
 * redemption came from, and how much real revenue it turned into.
 */

// ---------------------------------------------------------------------------
// Platform Operator — full CRUD (partner + its one tracking coupon, together)
// ---------------------------------------------------------------------------

/** One row per partner, with their redemption count/limit (straight off the
 * coupon row, same numbers CouponsManager already shows) and total revenue
 * — the sum of every completed payment ever made by a company that
 * redeemed their code. Deliberately lifetime, not just the first payment:
 * an influencer who brings in a company that stays subscribed for a year
 * generated all of that, not just the first month's charge. */
export async function listPartnersForAdmin() {
  if (!(await hasPartnersSchema())) return [];
  const paymentsReady = await hasSubscriptionPaymentsTable();
  const [rows] = await pool.query(
    `SELECT p.*, c.id AS coupon_id, c.code, c.discount_type, c.discount_value, c.max_redemptions, c.redemption_count, c.status AS coupon_status,
            (SELECT COUNT(DISTINCT r.company_id) FROM coupon_redemptions r WHERE r.coupon_id = c.id) AS companies_referred
            ${paymentsReady ? `, COALESCE((
              SELECT SUM(sp.amount) FROM subscription_payments sp
              WHERE sp.status = 'completed' AND sp.company_id IN (SELECT DISTINCT company_id FROM coupon_redemptions WHERE coupon_id = c.id)
            ), 0) AS revenue` : `, 0 AS revenue`}
     FROM partners p
     LEFT JOIN coupons c ON c.partner_id = p.id
     ORDER BY p.created_at DESC`
  );
  return rows;
}

export async function createPartner(session, data) {
  assertPlatformOperator(session);
  if (!(await hasPartnersSchema())) assertSchemaReady();
  const name = (data.name || "").trim();
  if (!name) { const e = new Error("Partner name is required."); e.status = 400; throw e; }
  const code = normalizeCode(data.code);
  if (!code) { const e = new Error("Referral/coupon code is required."); e.status = 400; throw e; }
  const discountValue = validateDiscount(data.discountType, data.discountValue);

  const [[existingCode]] = await pool.query(`SELECT id FROM coupons WHERE code = ?`, [code]);
  if (existingCode) { const e = new Error(`Coupon code "${code}" already exists.`); e.status = 409; throw e; }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [partnerResult] = await conn.query(
      `INSERT INTO partners (name, email, phone, notes, status, created_by) VALUES (?,?,?,?,?,?)`,
      [name, data.email || null, data.phone || null, data.notes || null, data.status === "inactive" ? "inactive" : "active", session.id]
    );
    const partnerId = partnerResult.insertId;
    await conn.query(
      `INSERT INTO coupons (code, partner_id, discount_type, discount_value, max_redemptions, valid_from, valid_until, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [code, partnerId, data.discountType, discountValue, data.maxRedemptions || null, data.validFrom || null, data.validUntil || null, data.status === "inactive" ? "inactive" : "active", session.id]
    );
    await conn.commit();
    await logActivity({ userId: session.id, module: "platform", action: "partner_created", entityType: "partner", entityId: partnerId, description: `Added partner "${name}" with code "${code}"` }).catch(() => {});
    return { id: partnerId, code };
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

export async function updatePartner(session, id, data) {
  assertPlatformOperator(session);
  if (!(await hasPartnersSchema())) assertSchemaReady();
  const [[existing]] = await pool.query(`SELECT p.*, c.id AS coupon_id FROM partners p LEFT JOIN coupons c ON c.partner_id = p.id WHERE p.id = ?`, [id]);
  if (!existing) { const e = new Error("Partner not found."); e.status = 404; throw e; }
  const name = (data.name || "").trim();
  if (!name) { const e = new Error("Partner name is required."); e.status = 400; throw e; }
  const discountValue = validateDiscount(data.discountType, data.discountValue);
  const status = data.status === "inactive" ? "inactive" : "active";

  await pool.query(`UPDATE partners SET name=?, email=?, phone=?, notes=?, status=? WHERE id=?`, [name, data.email || null, data.phone || null, data.notes || null, status, id]);
  if (existing.coupon_id) {
    await pool.query(
      `UPDATE coupons SET discount_type=?, discount_value=?, max_redemptions=?, valid_from=?, valid_until=?, status=? WHERE id=?`,
      [data.discountType, discountValue, data.maxRedemptions || null, data.validFrom || null, data.validUntil || null, status, existing.coupon_id]
    );
  }
  await logActivity({ userId: session.id, module: "platform", action: "partner_updated", entityType: "partner", entityId: id, description: `Updated partner "${name}"` }).catch(() => {});
}

/** Deleting a partner also removes their coupon — refused (same as
 * deleteCoupon) once it's actually been redeemed, since that's real
 * financial/attribution history. Deactivate instead in that case. */
export async function deletePartner(session, id) {
  assertPlatformOperator(session);
  if (!(await hasPartnersSchema())) assertSchemaReady();
  const [[existing]] = await pool.query(`SELECT p.*, c.id AS coupon_id, c.redemption_count FROM partners p LEFT JOIN coupons c ON c.partner_id = p.id WHERE p.id = ?`, [id]);
  if (!existing) { const e = new Error("Partner not found."); e.status = 404; throw e; }
  if (Number(existing.redemption_count) > 0) {
    const e = new Error("This partner's code has already been redeemed and can't be deleted — deactivate it instead to stop new use."); e.status = 409; throw e;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (existing.coupon_id) await conn.query(`DELETE FROM coupons WHERE id = ?`, [existing.coupon_id]);
    await conn.query(`DELETE FROM partners WHERE id = ?`, [id]);
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
  await logActivity({ userId: session.id, module: "platform", action: "partner_deleted", entityType: "partner", entityId: id, description: `Deleted partner "${existing.name}"` }).catch(() => {});
}

/** Which specific companies a partner's code has actually converted —
 * newest first, with what each one has paid in total since redeeming (not
 * just the discounted first payment), so "kitna aaya" has a real number
 * per company, not just an aggregate. */
export async function getPartnerDetail(session, id) {
  assertPlatformOperator(session);
  if (!(await hasPartnersSchema())) assertSchemaReady();
  const [[partner]] = await pool.query(`SELECT p.*, c.id AS coupon_id, c.code, c.discount_type, c.discount_value, c.max_redemptions, c.redemption_count, c.status AS coupon_status FROM partners p LEFT JOIN coupons c ON c.partner_id = p.id WHERE p.id = ?`, [id]);
  if (!partner) { const e = new Error("Partner not found."); e.status = 404; throw e; }
  if (!partner.coupon_id) return { partner, redemptions: [] };

  const paymentsReady = await hasSubscriptionPaymentsTable();
  const [redemptions] = await pool.query(
    `SELECT r.id, r.company_id, co.name AS company_name, r.discount_amount, r.redeemed_at
            ${paymentsReady ? `, COALESCE((SELECT SUM(sp.amount) FROM subscription_payments sp WHERE sp.status='completed' AND sp.company_id = r.company_id), 0) AS company_revenue` : `, 0 AS company_revenue`}
     FROM coupon_redemptions r
     LEFT JOIN companies co ON co.id = r.company_id
     WHERE r.coupon_id = ?
     ORDER BY r.redeemed_at DESC`,
    [partner.coupon_id]
  );
  return { partner, redemptions };
}
