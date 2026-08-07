/**
 * Minimal, dependency-free User-Agent sniffing for analytics grouping
 * only (device/browser buckets) — not meant to be exhaustive, just
 * good enough to answer "mostly mobile or desktop", "mostly Chrome or
 * Safari". No new package installed for this.
 */
export function parseUserAgent(ua = "") {
  const s = ua || "";
  let device = "Desktop";
  if (/tablet|ipad/i.test(s)) device = "Tablet";
  else if (/mobile|android|iphone/i.test(s)) device = "Mobile";

  let browser = "Other";
  if (/edg\//i.test(s)) browser = "Edge";
  else if (/chrome\//i.test(s) && !/edg\//i.test(s)) browser = "Chrome";
  else if (/firefox\//i.test(s)) browser = "Firefox";
  else if (/safari\//i.test(s) && !/chrome\//i.test(s)) browser = "Safari";

  return { device, browser };
}

/**
 * Country is only ever populated from geo headers an edge/CDN platform
 * injects (Vercel, Cloudflare) — never guessed, never fetched from a
 * third-party IP-lookup service without that being an explicit,
 * approved dependency. Returns null (not a fabricated default) when
 * neither header is present, e.g. running behind a plain Node host.
 */
export function getGeoCountry(request) {
  return request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || null;
}
