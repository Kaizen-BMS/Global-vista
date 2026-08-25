import "server-only";

/**
 * Builds a real UPI deep link using NPCI's standard "upi://pay" URI scheme
 * — the same format every UPI app (GPay, PhonePe, Paytm, BHIM, ...)
 * understands for merchant/P2P QR codes. This is a public, documented URI
 * format, not a payment gateway API — no credentials, no third party, no
 * transaction fee: money moves directly between the payer's bank and the
 * company's own UPI ID (`pa`), exactly like the static QR stand at a shop
 * or petrol pump.
 *
 * Amount (`am`) is only included when a fixed amount is given — omitting
 * it is what makes a UPI QR "negotiable": the payer's app prompts them to
 * enter whatever amount, same as scanning an open merchant QR.
 */
export function buildUpiLink({ upiId, payeeName, amount = null, note = null }) {
  if (!upiId) return null;
  const params = new URLSearchParams();
  params.set("pa", upiId);
  params.set("pn", (payeeName || "").slice(0, 100) || "Payment");
  params.set("cu", "INR");
  if (amount != null && Number(amount) > 0) params.set("am", Number(amount).toFixed(2));
  if (note) params.set("tn", String(note).slice(0, 100));
  return `upi://pay?${params.toString()}`;
}
