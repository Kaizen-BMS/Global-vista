import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpaySubscriptions";
import { processRazorpayWebhookEvent } from "@/lib/platform/actions/razorpayBilling";

/**
 * Razorpay webhook receiver. Every event is (1) signature-verified against
 * the RAW request body using RAZORPAY_WEBHOOK_SECRET before anything else
 * runs, (2) recorded in payment_webhook_events (gateway='razorpay') for
 * idempotency, then (3) dispatched. This route intentionally does NOT use
 * withCsrf (Razorpay itself is the caller, not a browser with our session
 * cookie) and does NOT require our own auth — signature verification is
 * the auth.
 *
 * Razorpay doesn't put a stable event id in the JSON body the way PayPal
 * does — it sends one via the `x-razorpay-event-id` header. If that header
 * is ever absent (older account configs), a SHA-256 hash of the raw body
 * is used instead: an identical redelivery hashes identically, so
 * idempotency still holds either way.
 */
export async function POST(request) {
  const rawBody = await request.text();

  const signature = request.headers.get("x-razorpay-signature");
  let verified;
  try {
    verified = verifyRazorpayWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("Razorpay webhook verification error:", err.message);
    return NextResponse.json({ error: "Verification failed." }, { status: err.status || 502 });
  }
  if (!verified) {
    console.error("Razorpay webhook signature verification FAILED.");
    return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id") || crypto.createHash("sha256").update(rawBody).digest("hex");

  try {
    await processRazorpayWebhookEvent({
      eventId,
      eventType: body.event,
      rawPayload: rawBody,
      payload: body.payload || {},
    });
  } catch (err) {
    console.error("Razorpay webhook processing error:", body.event, err.message);
    // Still 200 — Razorpay retries on non-2xx, and a processing failure is
    // already recorded in payment_webhook_events for manual investigation.
    return NextResponse.json({ received: true, processingError: true }, { status: 200 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
