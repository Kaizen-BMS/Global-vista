import "server-only";

/**
 * Exotel integration boundary — same "narrow, honest boundary" pattern as
 * billdeskClient.js. The classic "Connect two numbers" bridge-call API
 * (POST .../Calls/connect.json) is Exotel's oldest, most stable, publicly
 * documented endpoint and is implemented here with real confidence.
 *
 * What is NOT guaranteed byte-for-byte: the exact field names Exotel puts
 * in its StatusCallback POST body, and the exact JSON shape of the Call
 * Details GET response, can vary slightly by account/API version. Both
 * call sites below (see leadCalling.js) read several plausible field-name
 * variants defensively rather than assuming one — confirm the real payload
 * against your Exotel account's dashboard the first time a real call
 * completes, and adjust the variant list here if it uses a name not
 * already covered.
 */

export class ExotelNotConfiguredError extends Error {
  constructor(message = "Calling isn't configured for this company yet.") {
    super(message);
    this.name = "ExotelNotConfiguredError";
    this.status = 503;
  }
}

function authHeader(apiKey, apiToken) {
  return "Basic " + Buffer.from(`${apiKey}:${apiToken}`).toString("base64");
}

function baseUrl(apiBase) {
  // Exotel provisions accounts on different regional clusters (e.g.
  // api.exotel.com vs api.in.exotel.com) — the exact one is shown on the
  // company's own Exotel dashboard, hence this being admin-configurable
  // rather than hardcoded.
  return (apiBase || "https://api.exotel.com").replace(/\/+$/, "");
}

/**
 * Rings `from` (the employee's own phone) first; once answered, Exotel
 * bridges the call to `to` (the lead's number), with the call recorded on
 * Exotel's side end-to-end. Returns Exotel's own Call Sid, which is how
 * later status/recording callbacks get matched back to our lead_calls row.
 */
export async function placeExotelBridgeCall({ sid, apiKey, apiToken, apiBase, from, to, callerId, statusCallbackUrl }) {
  const url = `${baseUrl(apiBase)}/v1/Accounts/${encodeURIComponent(sid)}/Calls/connect.json`;
  const body = new URLSearchParams({
    From: from,
    To: to,
    CallerId: callerId,
    Record: "true",
    StatusCallback: statusCallbackUrl,
    TimeLimit: "3600",
    TimeOut: "30",
  });

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader(apiKey, apiToken), "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (err) {
    const e = new Error(`Could not reach Exotel: ${err.message}`); e.status = 502; throw e;
  }

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }

  if (!response.ok || !data?.Call?.Sid) {
    const message = data?.RestException?.Message || data?.Message || text || `Exotel returned HTTP ${response.status}.`;
    const e = new Error(`Exotel couldn't place the call: ${message}`); e.status = 502; throw e;
  }

  return { callSid: data.Call.Sid, status: data.Call.Status || "initiated" };
}

/** Fallback used when a StatusCallback didn't carry a recording URL yet
 * (recordings can take a few seconds to finalize after the call ends) —
 * fetches the call's own details, which should include one once ready. */
export async function fetchExotelCallDetails({ sid, apiKey, apiToken, apiBase, callSid }) {
  const url = `${baseUrl(apiBase)}/v1/Accounts/${encodeURIComponent(sid)}/Calls/${encodeURIComponent(callSid)}.json`;
  const response = await fetch(url, { headers: { Authorization: authHeader(apiKey, apiToken) } });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!response.ok || !data?.Call) {
    const e = new Error(`Could not fetch Exotel call details: ${data?.Message || text || response.status}`); e.status = 502; throw e;
  }
  return data.Call;
}
