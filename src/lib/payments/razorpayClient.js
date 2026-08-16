import "server-only";

/**
 * Low-level Razorpay REST client — HTTP Basic Auth (key_id:key_secret) + a
 * thin fetch wrapper, mirroring paypalClient.js's shape. No SDK dependency
 * — Razorpay's REST API is plain HTTP, so a direct fetch wrapper avoids
 * pulling in another package just for this.
 */

const BASE_URL = "https://api.razorpay.com/v1";

export function isRazorpayConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function assertConfigured() {
  if (!isRazorpayConfigured()) {
    const e = new Error("Razorpay is not configured on this server (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing).");
    e.status = 503;
    throw e;
  }
}

/** `path` starts with "/plans", "/subscriptions", etc. Throws with the real
 * Razorpay error payload on failure — never swallowed into a fake success. */
export async function razorpayFetch(path, { method = "GET", body } = {}) {
  assertConfigured();
  const basic = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const e = new Error(json?.error?.description || `Razorpay API error (${res.status}) on ${method} ${path}`);
    e.status = res.status >= 500 ? 502 : 400;
    e.razorpayDetails = json;
    throw e;
  }
  return json;
}
