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
 */
export default function PeekSchoolWatcher({ isPeeking = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (prev === pathname) return;
    if (!isPeeking) return;
    if (LEAD_DETAIL_RE.test(pathname)) return; // still inside the same lead (e.g. its /edit page) — stay switched

    // The new page already rendered (navigation happened before this
    // effect runs) using the still-switched session — router.refresh()
    // re-renders it against the now-exited one, same as every other
    // switch/exit action in this app already does.
    apiFetch("/api/core/session/switch-company", { method: "DELETE" })
      .then(() => router.refresh())
      .catch(() => { /* manual Exit banner still covers this */ });
  }, [pathname, isPeeking, router]);

  return null;
}
