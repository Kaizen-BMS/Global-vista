"use client";
export async function apiFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  if (method !== "GET" && method !== "HEAD") {
    const match = document.cookie.split("; ").find((r) => r.startsWith("gv_crm_csrf="));
    if (match) headers.set("X-CSRF-Token", decodeURIComponent(match.split("=")[1]));
  }
  return fetch(url, { ...options, headers });
}