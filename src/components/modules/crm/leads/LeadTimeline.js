"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

export default function LeadTimeline({ events }) {
  if (!events.length) {
    return <p className="text-neutral-500 text-sm py-8 text-center">No activity yet.</p>;
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-neutral-800" />
      <div className="space-y-6">
        {events.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="relative"
          >
            <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-neutral-950" />
            <p className="text-sm text-white">
              <span className="text-indigo-400">{event.user_name || "System"}</span> {event.description}
            </p>
            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {new Date(event.created_at).toLocaleString()}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}