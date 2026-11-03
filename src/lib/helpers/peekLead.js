import { apiFetch } from "@/components/shared/apiClient";

/**
 * Opening a lead that belongs to a DIFFERENT company (one of GVE's
 * schools) from a GVE-aggregated view — switches the session into that
 * lead's company first (exiting wherever it's currently switched, if
 * anywhere), same mechanism UserMenu.js's own "Switch to Company" already
 * uses, but with `peek: true` — the server marks the resulting session
 * `is_peeking`, which workspace/layout.js reads to keep showing GVE's own
 * sidebar/branding (and skip the "Viewing X" banner) instead of visibly
 * switching, and which PeekSchoolWatcher.js reads to silently exit back
 * to GVE once you navigate away from this lead. Shared by LeadsTable.js
 * and the dashboard's RecentLeadsTable — anywhere a GVE-aggregated list
 * links to an individual lead's own page.
 */
export async function openLeadAcrossCompanies({ router, leadId, companyId, homeCompanyId, gveCompanyId }) {
  if (homeCompanyId) {
    const res = await apiFetch("/api/core/session/switch-company", { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to exit the current school first.");
  }
  if (companyId !== gveCompanyId) {
    const res = await apiFetch("/api/core/session/switch-company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, peek: true }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to switch into that school.");
  }
  router.push(`/workspace/lead-management/${leadId}`);
  router.refresh();
}
