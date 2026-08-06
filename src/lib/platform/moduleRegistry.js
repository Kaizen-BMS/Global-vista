import "server-only";

/**
 * In-process module registry. Each module (currently only CRM) calls
 * registerModule() once at import time with its nav items, its
 * permission-module-slug, and (optionally) a search provider function.
 * Platform Core code (Sidebar's server-side data loader, Global Search)
 * reads from this registry instead of importing CRM-specific constants
 * directly — this is what makes adding a second module additive rather
 * than requiring edits to Platform Core files.
 *
 * NOTE: this is deliberately synchronous, in-memory, registered at
 * module load time — no async plugin discovery, no filesystem scanning.
 * That's appropriate for a handful of first-party modules; a true
 * third-party plugin system is out of scope until there's a real need
 * for one (matches the "don't build ahead of real requirements"
 * principle already established in this project's architecture docs).
 */
const registry = new Map();

export function registerModule(config) {
  const { slug, navItems = [], searchProvider = null, dashboardWidgets = [] } = config;
  if (!slug) throw new Error("registerModule requires a slug.");
  registry.set(slug, { slug, navItems, searchProvider, dashboardWidgets });
}

export function getRegisteredModule(slug) {
  return registry.get(slug) || null;
}

export function getAllRegisteredModules() {
  return Array.from(registry.values());
}

export function getNavItemsForModules(enabledSlugs) {
  const items = [];
  for (const slug of enabledSlugs) {
    const mod = registry.get(slug);
    if (mod) items.push(...mod.navItems);
  }
  return items;
}

export function getSearchProvidersForModules(enabledSlugs) {
  const providers = [];
  for (const slug of enabledSlugs) {
    const mod = registry.get(slug);
    if (mod?.searchProvider) providers.push(mod.searchProvider);
  }
  return providers;
}