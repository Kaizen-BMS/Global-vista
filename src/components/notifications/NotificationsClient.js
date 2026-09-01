"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Inbox, Settings2, X } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import { getNotificationCategory, CATEGORY_LABELS } from "@/lib/helpers/notificationCategories";

const OTHER_LABEL = "Other";

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-indigo-600 transition-colors peer-disabled:opacity-50" />
      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform" />
    </label>
  );
}

/**
 * Available to every employee, not gated behind any permission — filtering
 * and muting your OWN notifications is something everyone should be able
 * to do, same reasoning as the page itself having no permission check.
 * The company owner's own switches (Settings > Organizational Setting) are
 * a separate, company-wide layer — this is each person's personal one on
 * top of it (see the 2026-09-01 migration and createNotification's own
 * doc comment for how the two combine).
 */
export default function NotificationsClient({ initialNotifications, initialPreferences }) {
  const timezone = useTimezone();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [category, setCategory] = useState("all");
  const [readFilter, setReadFilter] = useState("all"); // all | unread
  const [markingAll, setMarkingAll] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [preferences, setPreferences] = useState(initialPreferences || {});
  const [savingPref, setSavingPref] = useState(null);

  const categoriesPresent = useMemo(() => {
    const present = new Set(notifications.map((n) => getNotificationCategory(n.type)));
    return Object.keys(CATEGORY_LABELS).filter((k) => present.has(k)).concat(present.has("other") ? ["other"] : []);
  }, [notifications]);

  const filtered = notifications.filter((n) => {
    if (readFilter === "unread" && n.is_read) return false;
    if (category !== "all" && getNotificationCategory(n.type) !== category) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    try {
      await apiFetch("/api/core/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    } catch { /* next load reconciles */ }
  }

  async function markAllRead() {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    try {
      await apiFetch("/api/core/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    } catch { /* next load reconciles */ } finally { setMarkingAll(false); }
  }

  async function togglePreference(key, enabled) {
    setPreferences((prev) => ({ ...prev, [key]: enabled }));
    setSavingPref(key);
    try {
      const res = await apiFetch("/api/core/notifications/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: key, enabled }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to save.");
    } catch (err) {
      setPreferences((prev) => ({ ...prev, [key]: !enabled })); // revert
      toast.error(err.message);
    } finally { setSavingPref(null); }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-full border border-border p-1 w-fit">
          {["all", "unread"].map((f) => (
            <button
              key={f} onClick={() => setReadFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition cursor-pointer ${readFilter === f ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f}{f === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={markAllRead} disabled={markingAll} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer disabled:opacity-60">
              <Check className="h-3.5 w-3.5" /> Mark all as read
            </button>
          )}
          <button onClick={() => setShowPrefs((s) => !s)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            <Settings2 className="h-3.5 w-3.5" /> Preferences
          </button>
        </div>
      </div>

      {showPrefs && (
        <div className="mb-4 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-foreground text-sm font-medium">Which notifications you get</p>
            <button onClick={() => setShowPrefs(false)} aria-label="Close preferences" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-muted-foreground text-xs mb-3">Turn a category off to stop it showing up for you — this is personal, it doesn't affect anyone else in your company.</p>
          <div className="divide-y divide-border">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm text-foreground">{label}</span>
                <Toggle checked={preferences[key] !== false} disabled={savingPref === key} onChange={(v) => togglePreference(key, v)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {categoriesPresent.length > 1 && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <button onClick={() => setCategory("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer border ${category === "all" ? "bg-indigo-600/10 text-indigo-400 border-indigo-600/30" : "text-muted-foreground border-border hover:text-foreground"}`}>
            All types
          </button>
          {categoriesPresent.map((c) => (
            <button
              key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer border ${category === c ? "bg-indigo-600/10 text-indigo-400 border-indigo-600/30" : "text-muted-foreground border-border hover:text-foreground"}`}
            >
              {CATEGORY_LABELS[c] || OTHER_LABEL}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-12 flex flex-col items-center gap-2 text-muted-foreground">
          <Inbox className="h-6 w-6" />
          <p className="text-sm">No notifications here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {filtered.map((n) => (
            <button
              key={n.id} onClick={() => !n.is_read && markRead(n.id)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition cursor-pointer hover:bg-muted/40 ${!n.is_read ? "bg-indigo-500/5" : ""}`}
            >
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${!n.is_read ? "bg-indigo-500" : "bg-transparent"}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${!n.is_read ? "text-foreground font-medium" : "text-foreground/80"}`}>{n.title}</p>
                {n.message && <p className="text-muted-foreground text-xs mt-0.5">{n.message}</p>}
                <p className="text-muted-foreground text-[11px] mt-1">{formatDateTime(n.created_at, timezone)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
