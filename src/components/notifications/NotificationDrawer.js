"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Check } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone, useHour12 } from "@/components/shared/TimezoneProvider";
import { formatDateTime, dayKey } from "@/lib/helpers/dateFormat";
import FloatingPanel from "@/components/shared/FloatingPanel";

// Bucketed by calendar day in the company's configured timezone, not the
// browser's — otherwise "Today"/"Yesterday" can disagree with the rest of
// the app for users in a different timezone than the tenant's setting.
function bucketOf(createdAt, timeZone) {
  const diffDays = Math.round((dayKey(new Date(), timeZone) - dayKey(new Date(createdAt), timeZone)) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  return "Older";
}

const BUCKET_ORDER = ["Unread", "Today", "Yesterday", "This Week", "Older"];

export default function NotificationDrawer({ anchorRef, open, notifications, onClose, onRead }) {
  const router = useRouter();
  const timezone = useTimezone();
  const hour12 = useHour12();
  const [query, setQuery] = useState("");

  async function markAll() { await apiFetch("/api/core/notifications", { method: "PUT" }); onRead(); }
  async function openNotification(n) {
    if (!n.is_read) await apiFetch("/api/core/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
    onRead();
    if (n.link) { onClose(); router.push(n.link); }
  }

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? notifications.filter((n) => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q)) : notifications;
    const groups = { Unread: [], Today: [], Yesterday: [], "This Week": [], Older: [] };
    for (const n of filtered) {
      if (!n.is_read) groups.Unread.push(n);
      else groups[bucketOf(n.created_at, timezone)].push(n);
    }
    return groups;
  }, [notifications, query, timezone]);

  const hasAny = notifications.length > 0;
  const hasResults = BUCKET_ORDER.some((b) => grouped[b].length > 0);
  const unreadCount = grouped.Unread.length;

  return (
    <FloatingPanel anchorRef={anchorRef} open={open} onClose={onClose} width={384} className="max-w-[92vw]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-foreground text-sm font-medium">Notifications</p>
        {unreadCount > 0 && (
          <button onClick={markAll} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors">
            <Check className="h-3 w-3" /> Mark all read
          </button>
        )}
      </div>

      {hasAny && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
          </div>
        </div>
      )}

      <div className="max-h-[28rem] overflow-y-auto py-2">
        {!hasAny && (
          <div className="flex flex-col items-center gap-2 text-center py-10">
            <Bell className="h-6 w-6 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No notifications.</p>
          </div>
        )}
        {hasAny && !hasResults && (
          <p className="text-muted-foreground text-sm text-center py-10">No notifications match &ldquo;{query}&rdquo;.</p>
        )}
        {BUCKET_ORDER.map((bucket) => {
          const items = grouped[bucket];
          if (!items.length) return null;
          return (
            <div key={bucket} className="mb-1 last:mb-0">
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{bucket}</p>
              <div className="divide-y divide-border/60">
                {items.map((n) => (
                  <button key={n.id} onClick={() => openNotification(n)} className={`relative w-full text-left px-4 py-3 hover:bg-muted/60 transition cursor-pointer ${!n.is_read ? "bg-indigo-500/5" : ""}`}>
                    {!n.is_read && <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                    <p className="text-foreground text-sm pl-2">{n.title}</p>
                    {n.message && <p className="text-muted-foreground text-xs mt-0.5 pl-2 line-clamp-2">{n.message}</p>}
                    <p className="text-muted-foreground/70 text-[10px] mt-1 pl-2">{formatDateTime(n.created_at, timezone, { hour12 })}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </FloatingPanel>
  );
}
