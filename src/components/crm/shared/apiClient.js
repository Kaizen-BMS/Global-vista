"use client";

export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});

  // Attach CSRF token if available
  const csrf = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf_token="))
    ?.split("=")[1];

  if (csrf) {
    headers.set("x-csrf-token", csrf);
  }

  return fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
}