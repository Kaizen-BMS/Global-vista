import "server-only";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { buildUpiLink } from "@/lib/payments/upiLink";
import { hasPaymentRequestsSchema } from "@/lib/db/schemaFlags";

function assertSchemaReady() {
  const e = new Error("Secure payment links aren't available yet — a database migration needs to be applied first."); e.status = 503; throw e;
}

/**
 * Mints one specific, unguessable payment-request link — the ONLY thing an
 * employee actually shares with a lead (via WhatsApp or otherwise), never
 * the company's own UPI ID or a raw upi://pay link with the amount in a
 * plain, editable query string. The token is the sole lookup key for both
 * the public confirmation page and the public QR image, so nothing about
 * the request (least of all the amount) can be altered after the fact by
 * whoever receives or forwards the link.
 */
export async function createPaymentRequest(session, { leadId = null, amount, note = null }, createdBy) {
  if (!(await hasPaymentRequestsSchema())) assertSchemaReady();
  const amt = Number(amount);
  if (!(amt > 0)) { const e = new Error("Amount must be a positive number."); e.status = 400; throw e; }

  const settings = await getSettingsByGroup(session, "payments");
  if (!settings.upi_id) { const e = new Error("Add your UPI ID in Settings > Payments before collecting a payment."); e.status = 400; throw e; }

  const token = crypto.randomBytes(24).toString("hex");
  await pool.query(
    `INSERT INTO payment_requests (company_id, lead_id, amount, currency, note, token, created_by) VALUES (?,?,?,?,?,?,?)`,
    [session.company_id, leadId, amt.toFixed(2), "INR", note ? String(note).slice(0, 200) : null, token, createdBy]
  );
  return { token };
}

/** Public lookup — no session. Only ever returns what a payer needs to see
 * (amount, currency, note, the company's own display name/UPI id for
 * building the QR) — never anything else about the company or the lead. */
export async function getPaymentRequestByToken(token) {
  if (!(await hasPaymentRequestsSchema())) return null;
  const [[row]] = await pool.query(
    `SELECT pr.amount, pr.currency, pr.note, pr.created_at, c.name AS company_name
     FROM payment_requests pr JOIN companies c ON c.id = pr.company_id
     WHERE pr.token = ? LIMIT 1`,
    [token]
  );
  if (!row) return null;

  const [rows] = await pool.query(
    `SELECT cs.\`key\`, cs.\`value\` FROM crm_settings cs
     JOIN payment_requests pr ON pr.company_id = cs.company_id
     WHERE pr.token = ? AND cs.\`group\` = 'payments' AND cs.\`key\` IN ('upi_id','upi_display_name')`,
    [token]
  );
  const upiSettings = rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});

  return {
    amount: row.amount, currency: row.currency, note: row.note, createdAt: row.created_at,
    companyName: row.company_name, upiId: upiSettings.upi_id || null, upiDisplayName: upiSettings.upi_display_name || row.company_name,
  };
}

/** Builds the real UPI deep link for a payment request — always from the
 * stored row's own amount/UPI id, never from anything a caller supplies. */
export function buildPaymentRequestUpiLink(request) {
  if (!request?.upiId) return null;
  return buildUpiLink({ upiId: request.upiId, payeeName: request.upiDisplayName, amount: request.amount, note: request.note });
}
