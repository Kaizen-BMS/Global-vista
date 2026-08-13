import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { registerCompany } from "@/lib/platform/actions/registration";
import { rateLimit } from "@/lib/helpers/rateLimit";

/**
 * Public, unauthenticated by design — there is no session yet, so no CSRF
 * token exists to check (same reasoning as the public lead-form submit
 * endpoint). Rate-limited per IP instead, same pattern as /api/core/auth/login,
 * since this endpoint can create real accounts and is the obvious abuse target.
 */
export const POST = withErrorHandling(async (request) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`register:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 }).allowed) {
    return badRequest("Too many registration attempts. Please try again later.");
  }
  const body = await request.json();
  const result = await registerCompany(body);
  return ok(result, 201);
});
