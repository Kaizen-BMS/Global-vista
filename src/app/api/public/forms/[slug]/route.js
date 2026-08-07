import { ok, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getPublicLeadForm, getPublicFormBranding, toPublicFormPayload } from "@/lib/modules/crm/actions/publicLeadForms";

// Genuinely public — no session, no permission check. toPublicFormPayload
// is an explicit allowlist so notify_emails / default assignment / company_id
// can never leak here even if the row gains more internal fields later.
export const GET = withErrorHandling(async (request, ctx) => {
  const { slug } = await ctx.params;
  const form = await getPublicLeadForm(slug);
  if (!form) return notFound();
  const branding = await getPublicFormBranding(form.company_id);
  return ok({ form: toPublicFormPayload(form), branding });
});
