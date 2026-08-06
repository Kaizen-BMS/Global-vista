import "server-only";
import { verifyCsrf } from "@/lib/helpers/csrf";
import { forbidden } from "@/lib/helpers/response";

export function withCsrf(handler) {
  return async (request, context) => {
    const method = request.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return handler(request, context);
    const valid = await verifyCsrf(request);
    if (!valid) return forbidden("Invalid or missing CSRF token. Please refresh and try again.");
    return handler(request, context);
  };
}