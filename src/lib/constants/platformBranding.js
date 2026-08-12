/**
 * The single source of truth for the platform owner's own identity — used
 * everywhere the app shows the PLATFORM's own branding rather than a
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
 *
 * The export name (GLOBAL_VISTA_BRANDING) is kept as-is deliberately —
 * it's the underlying software product's name, not the platform owner
 * operating this instance of it (KaizenBMS). Renaming the export would
 * touch every import across the app for a purely cosmetic reason;
 * the actual displayed values below are what matters.
 */
export const GLOBAL_VISTA_BRANDING = {
  name: "KaizenBMS Platform",
  shortName: "KaizenBMS",
  tagline: "Platform",
  // Space in the real uploaded filename must be percent-encoded here —
  // browsers usually auto-encode a literal space in an <img src>, but
  // email HTML (Outlook/some webmail renderers) does not reliably, and
  // this exact path is also fed straight into <link rel="icon">, which
  // never auto-encodes. Verified this resolves; the raw unencoded path
  // does not (confirmed via a direct request, not assumed).
  logoUrl: "/images/KaizenBMS%20logo.png",
  faviconUrl: "/favicon.ico",
  primaryColor: "#4f46e5",
  secondaryColor: "#171717",
  accentColor: "#22d3ee",
  supportEmail: null,
  supportPhone: null,
  poweredByLabel: "Powered by KaizenBMS",
};
