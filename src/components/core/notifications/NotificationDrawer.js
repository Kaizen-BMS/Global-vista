"use client";

import { motion } from "framer-motion";
import { CheckCheck } from "lucide-react";

export default function NotificationDrawer({ notifications, onReadAll, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 mt-3 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <p className="text-white text-sm font-medium">Notifications</p>
        <button
          onClick={onReadAll}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800">
        {notifications.length === 0 && (
          <p className="text-neutral-500 text-sm text-center py-8">No notifications yet.</p>
        )}
        {notifications.map((n) => (
          <div key={n.id} className={`px-4 py-3 ${!n.is_read ? "bg-indigo-500/5" : ""}`}>
            <p className="text-white text-sm">{n.title}</p>
            {n.message && <p className="text-neutral-400 text-xs mt-0.5">{n.message}</p>}
            <p className="text-neutral-600 text-[11px] mt-1">
              {new Date(n.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}