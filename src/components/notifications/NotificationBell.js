"use client";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import NotificationDrawer from "@/components/notifications/NotificationDrawer";

export default function NotificationBell() {
  const [open, setOpen] = useState(false); const [notifications, setNotifications] = useState([]); const [unreadCount, setUnreadCount] = useState(0);
  async function load() { const r = await fetch("/api/core/notifications"); const list = (await r.json()).notifications || []; setNotifications(list); setUnreadCount(list.filter((n) => !n.is_read).length); }
  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, []);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative text-neutral-400 hover:text-white cursor-pointer transition-colors">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-in zoom-in duration-200">{unreadCount}</span>}
      </button>
      {open && <NotificationDrawer notifications={notifications} onClose={() => setOpen(false)} onRead={load} />}
    </div>
  );
}
