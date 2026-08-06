import "server-only";
import { verifyCsrf } from "@/lib/helpers/csrf";
import { forbidden } from "@/lib/helpers/response";

/**
 * Wraps a mutating route handler (POST/PUT/PATCH/DELETE) with CSRF
 * verification. GET/HEAD/OPTIONS pass through untouched — CSRF only
 * applies to state-changing requests per spec.
 *
 * Usage: export const POST = withCsrf(withErrorHandling(async (req, ctx) => {...}))
 * withCsrf goes OUTSIDE withErrorHandling so a CSRF rejection returns
 * immediately without entering business logic or touching the DB.
 */
export function withCsrf(handler) {
  return async (request, context) => {
    const method = request.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return handler(request, context);
    }
    const valid = await verifyCsrf(request);
    if (!valid) {
      return forbidden("Invalid or missing CSRF token. Please refresh the page and try again.");
    }
    return handler(request, context);
  };
}