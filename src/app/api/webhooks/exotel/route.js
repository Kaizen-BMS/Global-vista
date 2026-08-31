import { NextResponse } from "next/server";
import { findCompanyIdByWebhookToken, handleExotelCallEvent } from "@/lib/modules/crm/actions/leadCalling";

/**
 * Exotel's StatusCallback receiver. No session, no CSRF — Exotel itself is
 * the caller (same reasoning as the Razorpay webhook). Exotel doesn't sign
 * its callbacks the way Razorpay does, so the per-company `token` query
 * param (embedded in the StatusCallback URL when the call was placed, see
 * leadCalling.js's ensureWebhookToken) is what stands in for verification
 * here — a request without a token that matches a real company's saved
 * calling settings is rejected outright.
 *
 * Exotel posts these as classic form-encoded fields, not JSON.
 */
export async function POST(request) {
  const token = new URL(request.url).searchParams.get("token");
  const companyId = await findCompanyIdByWebhookToken(token);
  if (!companyId) {
    return NextResponse.json({ error: "Invalid or unrecognized token." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  let payload = {};
  try {
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const form = await request.formData();
      payload = Object.fromEntries(form.entries());
    }
  } catch {
    return NextResponse.json({ error: "Could not parse callback body." }, { status: 400 });
  }

  try {
    await handleExotelCallEvent(companyId, payload);
  } catch (err) {
    console.error("Exotel webhook processing error:", err.message);
    // Still 200 — Exotel would otherwise retry indefinitely, and this is a
    // best-effort status sync, not money moving.
    return NextResponse.json({ received: true, processingError: true }, { status: 200 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
