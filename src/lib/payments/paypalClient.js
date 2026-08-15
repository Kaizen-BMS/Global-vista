import "server-only";

/**
 * Low-level PayPal REST client — OAuth2 client-credentials token + a thin
 * fetch wrapper. Nothing above this file ever touches PAYPAL_CLIENT_SECRET
 * directly; every PayPal call in the app goes through `paypalFetch` so the
 * base URL (sandbox vs live) and auth are resolved in exactly one place.
 * No SDK dependency — PayPal's REST API is plain HTTP, and the official
 * `@paypal/checkout-server-sdk` package has been effectively unmaintained,
 * so a direct fetch wrapper is both simpler and more current than pulling
 * in that dependency.
 */

function getMode() {
  const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();
  return mode === "live" ? "live" : "sandbox";
}

function getBaseUrl() {
  return getMode() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function isPayPalConfigured() {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function assertConfigured() {
  if (!isPayPalConfigured()) {
    const e = new Error("PayPal is not configured on this server (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing).");
    e.status = 503;
    throw e;
  }
}

// Cached in module scope, not per-request — a fresh OAuth2 token is valid
// for ~9 hours from PayPal; re-fetching it on every API call would be one
// extra round trip per operation for no reason. Refetched 60s before actual
// expiry so a token never gets used right at the edge of expiring mid-call.
let cachedToken = null; // { accessToken, expiresAt }

async function getAccessToken() {
  assertConfigured();
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.accessToken;

  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const e = new Error(`PayPal OAuth token request failed (${res.status}): ${body.slice(0, 300)}`);
    e.status = 502;
    throw e;
  }
  const data = await res.json();
  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.accessToken;
}

/**
 * `path` starts with "/v1/..." or "/v2/...". Throws with a real PayPal
 * error payload on failure — callers must not swallow this into a fake
 * success, per the standing "never fake a payment outcome" rule.
 */
export async function paypalFetch(path, { method = "GET", body, headers = {}, idempotencyKey } = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const e = new Error(json?.message || json?.error_description || `PayPal API error (${res.status}) on ${method} ${path}`);
    e.status = res.status >= 500 ? 502 : 400;
    e.paypalDetails = json;
    throw e;
  }
  return { data: json, status: res.status, headers: res.headers };
}

export { getMode as getPayPalMode, getBaseUrl as getPayPalBaseUrl };
