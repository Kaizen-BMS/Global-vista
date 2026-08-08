/**
 * Branding shown on the pre-login auth pages (login/forgot-password/
 * reset-password). There is no subdomain/slug tenant-resolution step
 * before authentication yet (a deliberate, previously-flagged scoping
 * decision — company_domains exists in the schema and would back that
 * feature if it's ever built), so every visitor sees Global Vista's own
 * identity here, exactly per the branding rule that Global Vista owns
 * Platform Login.
 *
 * Every auth component takes this as a `branding` prop rather than
 * hardcoding these values inline — the day tenant resolution exists,
 * only this lookup changes (swap the static object below for a real
 * one keyed off the resolved company), not the components themselves.
 */
export const GLOBAL_VISTA_AUTH_BRANDING = {
  name: "Global Vista",
  tagline: "Platform",
  logoUrl: "/images/logo.png",
  primaryColor: "#4f46e5",
  accentColor: "#22d3ee",
  supportEmail: null,
  supportPhone: null,
};
