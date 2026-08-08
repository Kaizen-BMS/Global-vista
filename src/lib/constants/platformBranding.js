/**
 * The single source of truth for Global Vista's own identity — used
 * everywhere the app shows Global Vista's own branding rather than a
 * tenant's: the Platform Console shell (sidebar, navbar), the pre-login
 * auth pages (login/forgot-password/reset-password), and the favicon
 * while inside either of those. Nothing here is ever swapped for a
 * tenant's `companies` row — that's the whole point of this constant
 * existing separately from the tenant branding system in
 * src/lib/actions/companyBranding.js.
 *
 * There is no subdomain/slug tenant-resolution step before authentication
 * yet (a deliberate, previously-flagged scoping decision — company_domains
 * exists in the schema and would back that feature if it's ever built), so
 * every pre-login visitor sees this identity too.
 */
export const GLOBAL_VISTA_BRANDING = {
  name: "Global Vista",
  shortName: "Platform Console",
  tagline: "Platform",
  logoUrl: "/images/logo.png",
  faviconUrl: "/favicon.ico",
  primaryColor: "#4f46e5",
  secondaryColor: "#171717",
  accentColor: "#22d3ee",
  supportEmail: null,
  supportPhone: null,
};
