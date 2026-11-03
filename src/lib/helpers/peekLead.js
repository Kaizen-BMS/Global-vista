import { apiFetch } from "@/components/shared/apiClient";

/**
 * Opening a lead that belongs to a DIFFERENT company (one of GVE's
 * schools) from a GVE-aggregated view — switches the session into that
 * lead's company first (exiting wherever it's currently switched, if
 * anywhere), same mechanism UserMenu.js's own "Switch to Company" already
 * uses. Marks the switch as a "peek" (gv:peekingSchool) so
 * PeekSchoolWatcher.js can silently exit back to GVE once the user
 * navigates away from this lead, instead of leaving them inside the
 * school until they remember to click Exit. Shared by LeadsTable.js and
 * the dashboard's RecentLeadsTable — anywhere a GVE-aggregated list links
 * to an individual lead's own page.
 */
export async function openLeadAcrossCompanies({ router, leadId, companyId, homeCompanyId, gveCompanyId }) {
  if (homeCompanyId) {
    const res = await apiFetch("/api/core/session/switch-company", { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to exit the current school first.");
  }
  if (companyId !== gveCompanyId) {
    const res = await apiFetch("/api/core/session/switch-company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to switch into that school.");
    try { sessionStorage.setItem("gv:peekingSchool", "1"); } catch { /* ignore */ }
  }
  router.push(`/workspace/lead-management/${leadId}`);
  router.refresh();
}
