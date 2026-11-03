"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/components/shared/apiClient";

// Matches the lead's own detail page AND its sub-routes (e.g. /edit) — a
// peek should survive navigating within the same lead, just not to
// anywhere else (the combined list, dashboard, another page entirely).
const LEAD_DETAIL_RE = /^\/workspace\/lead-management\/\d+(\/|$)/;

/**
 * Mounted once, always present (same pattern as OnboardingTour/
 * FeatureGuideWidget) — no-op unless `isPeeking` (session.is_peeking,
 * read fresh server-side on every request/navigation by workspace/
 * layout.js) is true, which only happens when GVE opens a lead from its
 * combined Leads view (see openLeadAcrossCompanies). Auto-exits the
 * silent "switch into that lead's school" the moment the path moves away
 * from that lead, so there's no manual "Exit to Global Vista Educators"
 * click needed for the common case of just viewing/working one lead and
 * moving on.
 *
 * Browser back/forward (popstate) is special-cased: it always lands you
 * on the exact combined-Leads-list URL (filters, selected school, and
 * all) the peek started from, rather than trusting wherever the browser
 * happens to land — a deliberate click elsewhere (Dashboard, another nav
 * item) is NOT overridden this way, it just gets a plain refresh against
 * the now-exited session, since that destination genuinely IS where the
 * user chose to go.
 */
export default function PeekSchoolWatcher({ isPeeking = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathRef = useRef(pathname);
  const viaPopStateRef = useRef(false);

  useEffect(() => {
    function onPopState() { viaPopStateRef.current = true; }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const prev = prevPathRef.current;
    const wasPopState = viaPopStateRef.current;
    viaPopStateRef.current = false;
    prevPathRef.current = pathname;
    if (prev === pathname) return;
    if (!isPeeking) return;
    if (LEAD_DETAIL_RE.test(pathname)) return; // still inside the same lead (e.g. its /edit page) — stay switched

    let returnTo = null;
    try { returnTo = sessionStorage.getItem("gv:peekReturnTo"); sessionStorage.removeItem("gv:peekReturnTo"); } catch { /* ignore */ }
    apiFetch("/api/core/session/switch-company", { method: "DELETE" })
      .then(() => {
        if (wasPopState && returnTo) router.push(returnTo);
        else router.refresh();
      })
      .catch(() => { /* manual Exit banner still covers this */ });
  }, [pathname, isPeeking, router]);

  return null;
}
