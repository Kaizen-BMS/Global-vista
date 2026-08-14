"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/components/shared/apiClient";
import { playNotificationSound, unlockNotificationSound } from "@/lib/helpers/notificationSound";

const STAGES = ["10min", "5min", "1min", "due"];
const POLL_MS = 20000;
const STORAGE_KEY = "gv:followupReminderStages";

function stageFor(diffMinutes) {
  if (diffMinutes <= 0) return "due";
  if (diffMinutes <= 1) return "1min";
  if (diffMinutes <= 5) return "5min";
  if (diffMinutes <= 10) return "10min";
  return null;
}

function loadShown() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveShown(map) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* storage unavailable — reminders just won't dedup across polls this tab */ }
}

/**
 * Mounted once in the workspace shell. Polls for follow-ups due soon and
 * escalates a toast (+ sound at 5min/1min/due) as the scheduled time
 * approaches — best-effort, in-tab only (see getUpcomingFollowupReminders
 * for why this is client-side idempotent rather than DB-backed). Never
 * fires the SAME stage twice for the same follow-up in this tab session.
 */
export default function FollowupReminderWatcher() {
  const router = useRouter();
  const shownRef = useRef({});

  useEffect(() => {
    shownRef.current = loadShown();
    document.addEventListener("click", unlockNotificationSound, { once: true });
    document.addEventListener("keydown", unlockNotificationSound, { once: true });

    async function poll() {
      try {
        const res = await apiFetch("/api/leads/followups/upcoming");
        if (!res.ok) return;
        const { followups } = await res.json();
        const now = Date.now();
        let changed = false;

        for (const f of followups) {
          const diffMinutes = (new Date(f.scheduled_at).getTime() - now) / 60000;
          const stage = stageFor(diffMinutes);
          if (!stage) continue;
          const stageIndex = STAGES.indexOf(stage);
          const lastIndex = STAGES.indexOf(shownRef.current[f.id] || "");
          if (stageIndex <= lastIndex) continue; // already shown this stage or a later one

          shownRef.current[f.id] = stage;
          changed = true;

          const title = stage === "due" ? "Follow-up due now" : `Follow-up in ${stage === "10min" ? "10" : stage === "5min" ? "5" : "1"} minute${stage === "1min" ? "" : "s"}`;
          const urgent = stage === "1min" || stage === "due";
          toast[urgent ? "warning" : "info"](title, {
            description: `${f.type} — ${f.lead_name}`,
            duration: urgent ? 10000 : 6000,
            action: { label: "View", onClick: () => router.push(`/workspace/lead-management/${f.lead_id}`) },
          });
          if (stage !== "10min") playNotificationSound(urgent);
        }

        if (changed) saveShown(shownRef.current);
      } catch { /* a missed poll just means the next one 20s later catches up — never surfaced to the user */ }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      clearInterval(id);
      document.removeEventListener("click", unlockNotificationSound);
      document.removeEventListener("keydown", unlockNotificationSound);
    };
  }, [router]);

  return null;
}
