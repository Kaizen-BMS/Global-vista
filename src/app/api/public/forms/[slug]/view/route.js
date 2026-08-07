import { ok, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getPublicLeadForm, recordFormView } from "@/lib/modules/crm/actions/publicLeadForms";
import { rateLimit } from "@/lib/helpers/rateLimit";
import { parseUserAgent, getGeoCountry } from "@/lib/helpers/userAgent";

// No CSRF here by design — anonymous visitors have no session cookie
// to derive a token from, same as the pre-existing public /api/contact
// route. Rate-limited per IP+form instead.
export const POST = withErrorHandling(async (request, ctx) => {
  const { slug } = await ctx.params;
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`form-view:${slug}:${ip}`, { max: 30, windowMs: 60 * 1000 }).allowed) return ok({ recorded: false });

  const form = await getPublicLeadForm(slug);
  if (!form) return notFound();

  const body = await request.json().catch(() => ({}));
  const { device, browser } = parseUserAgent(request.headers.get("user-agent") || "");
  await recordFormView(form, {
    source: body.source === "qr" ? "qr" : "link",
    ip, userAgent: request.headers.get("user-agent") || null, device, browser,
    country: getGeoCountry(request), referrer: request.headers.get("referer") || null,
  });
  return ok({ recorded: true });
});
