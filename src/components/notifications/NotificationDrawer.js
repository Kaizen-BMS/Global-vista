"use client";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/components/shared/apiClient";
export default function NotificationDrawer({ notifications, onClose, onRead }) {
  const router = useRouter();
  async function markAll() { await apiFetch("/api/core/notifications", { method: "PUT" }); onRead(); }
  async function openNotification(n) {
    if (!n.is_read) await apiFetch("/api/core/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
    onRead();
    if (n.link) { onClose(); router.push(n.link); }
  }
  return (
    <div className="absolute right-0 mt-3 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800"><p className="text-white text-sm font-medium">Notifications</p><button onClick={markAll} className="text-xs text-indigo-400">Mark all read</button></div>
      <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800">
        {notifications.length === 0 && <p className="text-neutral-500 text-sm text-center py-8">No notifications.</p>}
        {notifications.map((n) => (
          <button key={n.id} onClick={() => openNotification(n)} className={`w-full text-left px-4 py-3 hover:bg-neutral-800/60 transition ${!n.is_read ? "bg-indigo-500/5" : ""}`}>
            <p className="text-white text-sm">{n.title}</p>
            {n.message && <p className="text-neutral-500 text-xs mt-0.5">{n.message}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}