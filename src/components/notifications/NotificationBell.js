"use client";
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import NotificationDrawer from "@/components/notifications/NotificationDrawer";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenIds = useRef(null);
  const anchorRef = useRef(null);

  async function load({ silent = false } = {}) {
    const r = await fetch("/api/core/notifications?limit=50");
    const list = (await r.json()).notifications || [];

    if (!silent && seenIds.current) {
      const fresh = list.filter((n) => !n.is_read && !seenIds.current.has(n.id));
      for (const n of fresh.slice(0, 3)) {
        toast(n.title, {
          description: n.message || undefined,
          icon: <Bell className="h-4 w-4" />,
          style: {
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
          },
        });
      }
    }
    seenIds.current = new Set(list.map((n) => n.id));

    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.is_read).length);
  }

  useEffect(() => {
    load({ silent: true });
    const i = setInterval(() => load(), 30000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="relative">
      <button ref={anchorRef} onClick={() => setOpen((o) => !o)} className="relative text-muted-foreground hover:text-foreground cursor-pointer transition-colors" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-in zoom-in duration-200">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      <NotificationDrawer anchorRef={anchorRef} open={open} notifications={notifications} onClose={() => setOpen(false)} onRead={() => load({ silent: true })} />
    </div>
  );
}
