"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Closes the gap between "a revoked session is blocked on its next
 * request" (already true — getSession() checks user_sessions.revoked_at on
 * every call) and "an already-open tab notices within seconds." Without
 * this, a device sitting idle on an already-loaded page keeps looking
 * logged in until it happens to navigate or call an API — which, for an
 * idle tab, could be indefinitely. Same lightweight setInterval-poll
 * pattern Sidebar.js already uses for notification badges, just aimed at
 * /api/core/auth/session instead.
 */
export default function SessionLivenessWatcher() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/core/auth/session", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!data.user) {
          toast.error("Your session has ended.");
          router.replace("/login");
        }
      } catch { /* network hiccup — next poll retries, never force-logout on a fetch failure */ }
    }
    const id = setInterval(check, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [router]);

  return null;
}
