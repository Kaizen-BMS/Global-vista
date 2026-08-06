import { NextResponse } from "next/server";

export function ok(data = {}, status = 200) { return NextResponse.json({ success: true, ...data }, { status }); }
export function created(data = {}) { return ok(data, 201); }
export function fail(message = "Something went wrong.", status = 500, extra = {}) { return NextResponse.json({ success: false, error: message, ...extra }, { status }); }
export function forbidden(message = "Forbidden") { return fail(message, 403); }
export function unauthorized(message = "Unauthorized") { return fail(message, 401); }
export function notFound(message = "Not found.") { return fail(message, 404); }
export function badRequest(message = "Invalid request.", extra = {}) { return fail(message, 400, extra); }

export function withErrorHandling(handler) {
  return async (...args) => {
    try { return await handler(...args); }
    catch (err) {
      if (err.status === 403) return forbidden(err.message);
      if (err.status === 401) return unauthorized(err.message);
      if (err.status === 404) return notFound(err.message);
      if (err.status === 400) return badRequest(err.message);
      if (err.code === "ER_DUP_ENTRY") return fail("Duplicate entry.", 409);
      console.error("Unhandled API error:", err);
      return fail();
    }
  };
}