"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";

/**
 * The instant half of "live updates" — subscribes to
 * /api/core/realtime/stream (Server-Sent Events) and re-fetches the current
 * page's server-rendered data the moment anyone else in the same company
 * does something that calls logActivity (which is nearly every meaningful
 * mutation in the app already — see activityLog.js). EventSource
 * reconnects on its own if the connection drops; the existing 20s badge
 * poll stays in place underneath this as a fallback for the rare case a
 * network/proxy blocks long-lived connections outright.
 *
 * Deliberately does NOT distinguish which event fired — router.refresh()
 * just re-runs the current route's server components with fresh data,
 * which is cheap (a single request) and correct regardless of which of the
 * dozens of possible mutation types caused it.
 */
export default function RealtimeUpdatesWatcher() {
  const router = useRouter();
  const debounceRef = useRef(null);

  useEffect(() => {
    const source = new EventSource("/api/core/realtime/stream");

    source.onmessage = (e) => {
      let event;
      try { event = JSON.parse(e.data); } catch { return; }
      if (event.type === "connected") return;

      refreshSidebarBadges();
      // Bursts of related changes (e.g. a bulk assignment touching 20
      // leads) collapse into one refresh instead of one per event.
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => router.refresh(), 400);
    };

    return () => { source.close(); clearTimeout(debounceRef.current); };
  }, [router]);

  return null;
}
