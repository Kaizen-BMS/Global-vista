import "server-only";

/**
 * BillDesk integration boundary.
 *
 * This project does not yet have BillDesk's official merchant integration
 * specification (API base URLs, request/response shapes, checksum/signature
 * algorithm, webhook payload format) or live credentials. Inventing any of
 * that would risk shipping a "payment gateway" that silently fails, or worse,
 * accepts an unverifiable webhook as real. So this file draws a hard,
 * single, narrow boundary: everything OUTSIDE it (config detection, DB
 * writes, notifications, UI) is real and complete; everything INSIDE it
 * (the actual HTTP calls to BillDesk) throws a clear, typed error instead of
 * a fabricated response.
 *
 * Once BillDesk's spec + credentials are available, only the functions in
 * this one file need real implementations — every caller (billdeskBilling.js,
 * the checkout/confirm/webhook routes) already expects exactly this shape
 * and requires no further changes.
 */

export class BillDeskNotConfiguredError extends Error {
  constructor(message = "BillDesk is not configured.") {
    super(message);
    this.name = "BillDeskNotConfiguredError";
    this.status = 503;
  }
}

export class BillDeskNotImplementedError extends Error {
  constructor(operation) {
    super(
      `BillDesk ${operation} is not implemented yet — this project does not have BillDesk's official API specification or credentials. ` +
      `Provide the merchant integration document (checkout/order-create endpoint, checksum/signature algorithm, webhook payload format and verification method) to complete this.`
    );
    this.name = "BillDeskNotImplementedError";
    this.status = 501;
  }
}

// Every credential is env-only, never hardcoded, never stored in the DB,
// never sent to the browser. Which exact variables BillDesk's integration
// actually requires (merchant ID only? a client id/secret pair? a separate
// checksum key?) is not yet known — this reads the superset named in the
// implementation request and reports configured=true only once the ones
// that are actually present look like a real credential set, not a blank
// scaffold. Adjust this list once BillDesk's real requirement is confirmed.
function readConfig() {
  return {
    environment: (process.env.BILLDESK_ENVIRONMENT || "").toLowerCase() || null,
    merchantId: process.env.BILLDESK_MERCHANT_ID || null,
    clientId: process.env.BILLDESK_CLIENT_ID || null,
    clientSecret: process.env.BILLDESK_CLIENT_SECRET || null,
    secretKey: process.env.BILLDESK_SECRET_KEY || null,
    webhookSecret: process.env.BILLDESK_WEBHOOK_SECRET || null,
  };
}

/** Real, server-side config check — never assumes "configured" just because
 * a variable name exists in .env.example. Returns configured=true only when
 * a merchant id AND at least one credential/secret are actually present. */
export function getBillDeskStatus() {
  const cfg = readConfig();
  const configured = !!(cfg.merchantId && (cfg.clientSecret || cfg.secretKey));
  return {
    configured,
    environment: cfg.environment === "production" || cfg.environment === "live" ? "live" : "sandbox",
  };
}

function assertConfigured() {
  const status = getBillDeskStatus();
  if (!status.configured) throw new BillDeskNotConfiguredError();
  return status;
}

/**
 * Would create a BillDesk order/transaction and return a checkout
 * URL/redirect the browser opens to complete payment (UPI/Card/Debit/Net
 * Banking/etc., whatever BillDesk supports for this merchant).
 * NOT IMPLEMENTED — requires BillDesk's order-create API spec.
 */
export async function createBillDeskCheckout(/* { companyId, planId, amount, currency, customerEmail, customerName, returnUrl, orderReference } */) {
  assertConfigured();
  throw new BillDeskNotImplementedError("checkout/order creation");
}

/**
 * Would re-fetch a transaction's authoritative status directly from
 * BillDesk's servers (never trust a browser redirect's own query params as
 * proof of payment). NOT IMPLEMENTED — requires BillDesk's
 * transaction-status/enquiry API spec.
 */
export async function verifyBillDeskTransaction(/* orderId */) {
  assertConfigured();
  throw new BillDeskNotImplementedError("transaction verification");
}

/**
 * Would verify a BillDesk webhook/callback request is genuinely from
 * BillDesk (signature/checksum check against BILLDESK_WEBHOOK_SECRET or
 * whatever BillDesk's spec actually calls for) before any payload is
 * trusted. Until implemented, this function is unable to prove authenticity
 * — callers MUST treat every webhook as unverifiable and reject it, never
 * fall back to trusting it anyway.
 * NOT IMPLEMENTED — requires BillDesk's webhook signature specification.
 */
export async function verifyBillDeskWebhookSignature(/* headers, rawBody */) {
  throw new BillDeskNotImplementedError("webhook signature verification");
}

/**
 * Would cancel a recurring BillDesk mandate/subscription server-side.
 * NOT IMPLEMENTED — requires BillDesk's recurring/mandate cancellation API
 * spec (if the merchant account's enabled recurring capability even exposes
 * one — some Indian recurring rails only support pause/cancel via NPCI
 * flows, not a plain REST call).
 */
export async function cancelBillDeskMandate(/* gatewaySubscriptionId */) {
  assertConfigured();
  throw new BillDeskNotImplementedError("recurring mandate cancellation");
}
