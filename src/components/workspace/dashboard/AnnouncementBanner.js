"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, X } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import { useTimezone } from "@/components/shared/TimezoneProvider";

/**
 * Server-rendered from getLatestAnnouncement(session) — already null when
 * there's nothing to show or the viewer has already seen it, so this
 * component itself never has to decide "should I render at all", only
 * "has THIS viewer dismissed it since it mounted".
 */
export default function AnnouncementBanner({ announcement, label = "Company Announcement", accent = "amber" }) {
  const timezone = useTimezone();
  const [dismissed, setDismissed] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  if (!announcement || dismissed) return null;

  async function dismiss() {
    setDismissing(true);
    try {
      const res = await apiFetch("/api/messaging/announcement", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: announcement.conversationId }),
      });
      if (!res.ok) throw new Error();
      setDismissed(true);
    } catch { toast.error("Couldn't dismiss — try again."); } finally { setDismissing(false); }
  }

  const theme = accent === "indigo"
    ? { border: "border-indigo-500/30", bg: "bg-indigo-500/10", iconBg: "bg-indigo-500/15", iconText: "text-indigo-500", btnText: "text-indigo-700 dark:text-indigo-300", btnHover: "hover:bg-indigo-500/15" }
    : { border: "border-amber-500/30", bg: "bg-amber-500/10", iconBg: "bg-amber-500/15", iconText: "text-amber-500", btnText: "text-amber-700 dark:text-amber-300", btnHover: "hover:bg-amber-500/15" };

  return (
    <div className={`flex items-start gap-3 rounded-xl border ${theme.border} ${theme.bg} px-4 py-3.5`}>
      <div className={`shrink-0 h-9 w-9 rounded-full ${theme.iconBg} ${theme.iconText} flex items-center justify-center`}>
        <Megaphone className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-foreground text-sm font-semibold">{label}</p>
          <p className="text-muted-foreground text-xs">
            {announcement.senderName ? `${announcement.senderName} · ` : ""}{formatDateTime(announcement.createdAt, timezone)}
          </p>
        </div>
        <p className="text-foreground/90 text-sm mt-1 whitespace-pre-wrap break-words">{announcement.body}</p>
      </div>
      <button
        onClick={dismiss}
        disabled={dismissing}
        className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${theme.btnText} ${theme.btnHover} cursor-pointer transition disabled:opacity-50`}
        aria-label="I've seen this announcement"
      >
        <X className="h-3.5 w-3.5" /> I've seen this
      </button>
    </div>
  );
}
