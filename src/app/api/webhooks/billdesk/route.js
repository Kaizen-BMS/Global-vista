import { NextResponse } from "next/server";
import { verifyBillDeskWebhookSignature, BillDeskNotImplementedError } from "@/lib/payments/billdeskClient";
import { processBillDeskWebhookEvent } from "@/lib/platform/actions/billdeskBilling";

/**
 * BillDesk webhook/callback receiver.
 *
 * Signature verification (verifyBillDeskWebhookSignature) is NOT implemented
 * yet — this project does not have BillDesk's webhook payload format or
 * signature/checksum specification. Until it is, this route can never prove
 * a request genuinely came from BillDesk, so it REJECTS every request
 * (503) rather than trusting an unverifiable payload — "never trust only
 * frontend/unverified success" applies just as much to an unverified
 * webhook as to an unverified browser redirect.
 *
 * Once billdeskClient.js's verifyBillDeskWebhookSignature is implemented
 * against the real spec, this route's shape (verify → idempotency ledger →
 * dispatch → always 200 once ledger'd) will not need to change — only the
 * translation from BillDesk's real payload fields into the generic
 * { eventId, eventType, gatewayOrderId, paymentStatus, amount, currency }
 * shape processBillDeskWebhookEvent expects.
 */
export async function POST(request) {
  const rawBody = await request.text();

  let verifiedPayload;
  try {
    verifiedPayload = await verifyBillDeskWebhookSignature(request.headers, rawBody);
  } catch (err) {
    if (err instanceof BillDeskNotImplementedError) {
      console.error("BillDesk webhook received but signature verification is not implemented yet — rejecting.", err.message);
      return NextResponse.json({ error: "BillDesk webhook verification is not configured." }, { status: 503 });
    }
    console.error("BillDesk webhook verification error:", err.message);
    return NextResponse.json({ error: "Verification failed." }, { status: 502 });
  }
  if (!verifiedPayload) {
    console.error("BillDesk webhook signature verification returned FAILURE.");
    return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
  }

  try {
    await processBillDeskWebhookEvent({
      eventId: verifiedPayload.eventId,
      eventType: verifiedPayload.eventType,
      gatewayOrderId: verifiedPayload.gatewayOrderId,
      paymentStatus: verifiedPayload.paymentStatus,
      amount: verifiedPayload.amount,
      currency: verifiedPayload.currency,
      failureReason: verifiedPayload.failureReason,
      rawPayload: rawBody,
    });
  } catch (err) {
    console.error("BillDesk webhook processing error:", err.message);
    // Still 200 — a processing failure is already recorded in
    // payment_webhook_events for manual investigation; retrying an event
    // whose signature was already verified is safe (the ledger + idempotent
    // writes handle re-delivery).
    return NextResponse.json({ received: true, processingError: true }, { status: 200 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
