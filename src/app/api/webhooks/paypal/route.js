import { NextResponse } from "next/server";
import { verifyPayPalWebhookSignature } from "@/lib/payments/paypalSubscriptions";
import { processPayPalWebhookEvent } from "@/lib/platform/actions/paypalBilling";

/**
 * PayPal webhook receiver. Every event is (1) signature-verified against
 * PayPal's own verification endpoint before anything else runs, (2)
 * recorded in payment_webhook_events (gateway='paypal') keyed by PayPal's
 * event_id for idempotency, then (3) dispatched. A duplicate delivery — PayPal retries
 * webhooks that don't get a fast 2xx — is a guaranteed no-op past the
 * ledger insert. This route intentionally does NOT use withCsrf (PayPal
 * itself is the caller, not a browser with our session cookie) and does
 * NOT require our own auth — signature verification is the auth.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let verified;
  try {
    verified = await verifyPayPalWebhookSignature(request.headers, body);
  } catch (err) {
    console.error("PayPal webhook verification error:", err.message);
    return NextResponse.json({ error: "Verification failed." }, { status: err.status || 502 });
  }
  if (!verified) {
    console.error("PayPal webhook signature verification returned FAILURE for event", body?.id);
    return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
  }

  try {
    await processPayPalWebhookEvent({
      eventId: body.id,
      eventType: body.event_type,
      resourceType: body.resource_type,
      resource: body.resource || {},
      rawPayload: JSON.stringify(body),
    });
  } catch (err) {
    console.error("PayPal webhook processing error:", body.event_type, err.message);
    // Still 200 — PayPal will retry on non-2xx, and a processing failure is
    // already recorded in paypal_webhook_events for manual investigation;
    // retrying an event whose signature we already verified is safe (the
    // ledger + idempotent writes below handle re-delivery), but retrying
    // forever on a genuinely broken payload just adds noise.
    return NextResponse.json({ received: true, processingError: true }, { status: 200 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
