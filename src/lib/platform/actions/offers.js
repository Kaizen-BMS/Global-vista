import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { hasOffersSchema } from "@/lib/db/schemaFlags";

function assertSchemaReady() {
  const e = new Error("The offers schema hasn't been applied to this database yet."); e.status = 503; throw e;
}

// ---------------------------------------------------------------------------
// Platform Operator — full CRUD
// ---------------------------------------------------------------------------

export async function listOffersForAdmin() {
  if (!(await hasOffersSchema())) return [];
  const [rows] = await pool.query(`SELECT * FROM platform_offers ORDER BY sort_order ASC, created_at DESC`);
  return rows;
}

export async function createOffer(session, data) {
  assertPlatformOperator(session);
  if (!(await hasOffersSchema())) assertSchemaReady();
  const text = (data.text || "").trim();
  if (!text) { const e = new Error("Offer text is required."); e.status = 400; throw e; }

  const [[maxRow]] = await pool.query(`SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM platform_offers`);
  const [result] = await pool.query(
    `INSERT INTO platform_offers (text, sort_order, status, created_by) VALUES (?,?,?,?)`,
    [text, Number(maxRow.maxOrder) + 1, data.status === "inactive" ? "inactive" : "active", session.id]
  );
  await logActivity({ userId: session.id, module: "platform", action: "offer_created", entityType: "platform_offer", entityId: result.insertId, description: `Added offer "${text}"` }).catch(() => {});
  return { id: result.insertId };
}

export async function updateOffer(session, id, data) {
  assertPlatformOperator(session);
  if (!(await hasOffersSchema())) assertSchemaReady();
  const [[existing]] = await pool.query(`SELECT id FROM platform_offers WHERE id = ?`, [id]);
  if (!existing) { const e = new Error("Offer not found."); e.status = 404; throw e; }
  const text = (data.text || "").trim();
  if (!text) { const e = new Error("Offer text is required."); e.status = 400; throw e; }

  await pool.query(`UPDATE platform_offers SET text=?, status=? WHERE id=?`, [text, data.status === "inactive" ? "inactive" : "active", id]);
  await logActivity({ userId: session.id, module: "platform", action: "offer_updated", entityType: "platform_offer", entityId: id, description: "Updated offer" }).catch(() => {});
}

export async function deleteOffer(session, id) {
  assertPlatformOperator(session);
  if (!(await hasOffersSchema())) assertSchemaReady();
  const [[existing]] = await pool.query(`SELECT id FROM platform_offers WHERE id = ?`, [id]);
  if (!existing) { const e = new Error("Offer not found."); e.status = 404; throw e; }
  await pool.query(`DELETE FROM platform_offers WHERE id = ?`, [id]);
  await logActivity({ userId: session.id, module: "platform", action: "offer_deleted", entityType: "platform_offer", entityId: id, description: "Deleted offer" }).catch(() => {});
}

/** Full reorder, not incremental — Platform Operator moves offers up/down
 * client-side, this writes exactly that order. */
export async function reorderOffers(session, orderedIds) {
  assertPlatformOperator(session);
  if (!(await hasOffersSchema())) assertSchemaReady();
  const ids = Array.isArray(orderedIds) ? orderedIds.map(Number).filter(Boolean) : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < ids.length; i++) {
      await conn.query(`UPDATE platform_offers SET sort_order = ? WHERE id = ?`, [i, ids[i]]);
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

// ---------------------------------------------------------------------------
// Public — active only
// ---------------------------------------------------------------------------

export async function listActiveOffers() {
  if (!(await hasOffersSchema())) return [];
  const [rows] = await pool.query(`SELECT id, text FROM platform_offers WHERE status = 'active' ORDER BY sort_order ASC`);
  return rows;
}
