import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getEnabledModuleSlugs } from "@/lib/platform/tenant";
import { getSearchProvidersForModules } from "@/lib/platform/moduleRegistry";
import "@/lib/platform/registerCrmModule";

/**
 * Replaces app/api/search/route.js's CRM-hardcoded implementation with
 * a registry-driven aggregator per the module-search-provider pattern.
 * Kept at a new path (/api/platform/search) rather than overwriting the
 * old one in this batch, so the existing GlobalSearch component can be
 * repointed deliberately rather than silently changing behavior under
 * an unmodified import path — avoids an accidental behavior change
 * exactly where "avoid unnecessary movement" and "don't break working
 * things" both apply.
 */
export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return ok({ results: [] });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return ok({ results: [] });

  const enabledSlugs = await getEnabledModuleSlugs(session.company_id);
  const providers = getSearchProvidersForModules(enabledSlugs);

  const results = await Promise.all(providers.map((provider) => provider(session, q)));
  return ok({ results: results.filter((r) => r.results.length > 0) });
});