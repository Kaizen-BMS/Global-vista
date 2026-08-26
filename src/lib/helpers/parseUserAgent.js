/** Lightweight, dependency-free User-Agent summary for the "Active
 * Sessions" list — good enough to tell devices apart at a glance (browser +
 * OS), not a full UA-parsing library. Order matters: Edge/OPR must be
 * checked before Chrome (both include "Chrome" in their UA string), and
 * iPad/iPhone before generic "Mac OS X" (iOS UAs also contain that token). */
export function parseUserAgent(ua) {
  if (!ua) return { browser: "Unknown browser", os: "Unknown device" };

  let browser = "Unknown browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = "Safari";

  let os = "Unknown device";
  if (/iPhone/.test(ua)) os = "iPhone";
  else if (/iPad/.test(ua)) os = "iPad";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "Mac";
  else if (/Linux/.test(ua)) os = "Linux";

  return { browser, os, summary: `${browser} on ${os}` };
}
