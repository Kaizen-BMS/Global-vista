import { ok, notFound, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getPublicLeadForm, submitPublicLeadForm } from "@/lib/modules/crm/actions/publicLeadForms";
import { rateLimit } from "@/lib/helpers/rateLimit";
import { parseUserAgent, getGeoCountry } from "@/lib/helpers/userAgent";
import { verifyRecaptcha } from "@/lib/helpers/recaptcha";

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"];

export const POST = withErrorHandling(async (request, ctx) => {
  const { slug } = await ctx.params;
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`form-submit:${slug}:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 }).allowed) {
    return badRequest("Too many submissions from this connection. Please try again later.");
  }

  const form = await getPublicLeadForm(slug);
  if (!form) return notFound();

  const body = await request.json().catch(() => ({}));

  if (form.recaptcha_enabled) {
    const { valid } = await verifyRecaptcha(body.recaptchaToken);
    if (!valid) return badRequest("Verification failed. Please try again.");
  }

  const { device, browser } = parseUserAgent(request.headers.get("user-agent") || "");
  const utm = {};
  for (const key of UTM_KEYS) if (body[`utm_${key}`]) utm[key] = body[`utm_${key}`];

  const result = await submitPublicLeadForm(form, body, {
    ip, userAgent: request.headers.get("user-agent") || null, device, browser,
    country: getGeoCountry(request), referrer: request.headers.get("referer") || null,
    utm, completionMs: body.__completionMs || null,
  });

  if (!result.success) return badRequest(result.errors?.join(" ") || "Submission failed.");
  return ok({ success: true, redirectUrl: form.redirect_url || null, successMessage: form.success_message || null });
});
