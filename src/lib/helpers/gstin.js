/**
 * India GSTIN (GST Identification Number) format + checksum validation.
 * Deliberately framework-agnostic (no "server-only") — the same check
 * runs client-side for instant feedback on the invoice screen and
 * server-side before it's ever saved to a company's record.
 *
 * This validates STRUCTURE only: the 15-character format (state code +
 * PAN + entity code + 'Z' + check digit) and the official checksum digit
 * — it does NOT call the government's GST portal to confirm the number is
 * actually registered/active, which requires a paid GSP/ASP integration
 * this project doesn't have. A GSTIN that passes this check is
 * well-formed and internally consistent; it is not proof of a live
 * registration. GST itself is charged on every invoice regardless of
 * whether a GSTIN is on file or valid — this field is for the buyer's own
 * tax record on the invoice, never a condition for whether GST applies.
 */
const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const CHECKSUM_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function charValue(c) { return CHECKSUM_CHARS.indexOf(c); }

/** The official GSTIN check-digit algorithm (mod-36, alternating ×1/×2
 * factor over the first 14 characters). */
function computeCheckDigit(gstin14) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const factor = i % 2 === 0 ? 1 : 2;
    let value = charValue(gstin14[i]) * factor;
    value = Math.floor(value / 36) + (value % 36);
    sum += value;
  }
  const checksum = (36 - (sum % 36)) % 36;
  return CHECKSUM_CHARS[checksum];
}

/** Normalizes to uppercase/trimmed, the same shape a buyer's raw typed
 * input should be coerced to before validating or storing. */
export function normalizeGstin(value) {
  return String(value || "").trim().toUpperCase();
}

/** Returns { valid: boolean, reason?: string } — never throws, so it's
 * safe to call on every keystroke for live inline feedback. */
export function validateGstin(value) {
  const gstin = normalizeGstin(value);
  if (!gstin) return { valid: false, reason: "empty" };
  if (gstin.length !== 15) return { valid: false, reason: "GSTIN must be 15 characters." };
  if (!GSTIN_SHAPE.test(gstin)) return { valid: false, reason: "Doesn't match the GSTIN format (state code + PAN + entity code)." };
  const expected = computeCheckDigit(gstin.slice(0, 14));
  if (expected !== gstin[14]) return { valid: false, reason: "Check digit doesn't match — please re-check the number." };
  return { valid: true };
}

export function isValidGstin(value) { return validateGstin(value).valid; }
