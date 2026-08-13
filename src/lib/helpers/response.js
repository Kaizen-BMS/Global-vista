import { NextResponse } from "next/server";

export function ok(data = {}, status = 200) { return NextResponse.json({ success: true, ...data }, { status }); }
export function created(data = {}) { return ok(data, 201); }
export function fail(message = "Something went wrong.", status = 500, extra = {}) { return NextResponse.json({ success: false, error: message, ...extra }, { status }); }
export function forbidden(message = "Forbidden") { return fail(message, 403); }
export function unauthorized(message = "Unauthorized") { return fail(message, 401); }
export function notFound(message = "Not found.") { return fail(message, 404); }
export function badRequest(message = "Invalid request.", extra = {}) { return fail(message, 400, extra); }

// MySQL's ER_DUP_ENTRY sqlMessage looks like `Duplicate entry 'foo@bar.com'
// for key 'users.email'` (or just `'email'`/`'uk_company_name'` depending on
// version) — pulling the offending value and a friendly field name out of it
// turns "Duplicate entry." into "A record with this email already exists.",
// which is what every caller of withErrorHandling actually wants, without
// each of the ~20 routes that can hit a unique constraint needing its own
// duplicate-handling logic.
function describeDuplicateEntry(sqlMessage) {
  const match = /Duplicate entry '(.+)' for key '([^']+)'/.exec(sqlMessage || "");
  if (!match) return "This record already exists.";
  const [, value, key] = match;
  const field = key.split(".").pop().toLowerCase();
  const label = field.includes("email") ? "email address"
    : field.includes("employee_id") || field.includes("employeeid") ? "employee ID"
    : field.includes("slug") ? "URL slug"
    : field.includes("phone") ? "phone number"
    : field.includes("name") ? "name"
    : field.includes("code") ? "code"
    : "value";
  return `A record with this ${label} ("${value}") already exists.`;
}

export function withErrorHandling(handler) {
  return async (...args) => {
    try { return await handler(...args); }
    catch (err) {
      if (err.status === 403) return forbidden(err.message);
      if (err.status === 401) return unauthorized(err.message);
      if (err.status === 404) return notFound(err.message);
      if (err.status === 400) return badRequest(err.message);
      if (err.code === "ER_DUP_ENTRY") return fail(describeDuplicateEntry(err.sqlMessage), 409);
      // Any other explicit status (e.g. 409 for a duplicate payment
      // reference or an already-claimed lead) still deserves its own
      // message, not the generic 500 below — this previously fell through
      // silently and only "worked" because a couple of callers happened to
      // hardcode a matching client-side fallback string.
      if (err.status) return fail(err.message, err.status);
      console.error("Unhandled API error:", err);
      return fail();
    }
  };
}