"use client";

import { motion } from "framer-motion";
import {
  Clock, Plus, Pencil, ArrowRightLeft, Tag, UserPlus, StickyNote, CalendarClock,
  CheckCircle2, ListChecks, RotateCcw, GitMerge, Trash2, Users,
} from "lucide-react";

const ACTION_META = {
  create: { icon: Plus, color: "bg-emerald-500" },
  update: { icon: Pencil, color: "bg-neutral-500" },
  stage_change: { icon: ArrowRightLeft, color: "bg-indigo-500" },
  status_change: { icon: Tag, color: "bg-amber-500" },
  assign: { icon: UserPlus, color: "bg-blue-500" },
  note_add: { icon: StickyNote, color: "bg-yellow-500" },
  followup_scheduled: { icon: CalendarClock, color: "bg-purple-500" },
  followup_completed: { icon: CheckCircle2, color: "bg-green-500" },
  task_create: { icon: ListChecks, color: "bg-cyan-500" },
  task_complete: { icon: CheckCircle2, color: "bg-green-500" },
  task_reopen: { icon: RotateCcw, color: "bg-orange-500" },
  merge: { icon: GitMerge, color: "bg-pink-500" },
  delete: { icon: Trash2, color: "bg-red-500" },
  bulk_status_change: { icon: Tag, color: "bg-amber-500" },
  bulk_assign: { icon: Users, color: "bg-blue-500" },
};

function groupLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a, b) => a.toDateString() === b.toDateString();
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

export default function LeadTimeline({ events }) {
  if (!events.length) {
    return <p className="text-neutral-500 text-sm py-8 text-center">No activity yet.</p>;
  }

  const groups = [];
  for (const event of events) {
    const label = groupLabel(event.created_at);
    let group = groups.find((g) => g.label === label);
    if (!group) { group = { label, events: [] }; groups.push(group); }
    group.events.push(event);
  }

  let i = 0;
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-3">{group.label}</p>
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-neutral-800" />
            <div className="space-y-5">
              {group.events.map((event) => {
                const meta = ACTION_META[event.action] || { icon: Clock, color: "bg-neutral-600" };
                const Icon = meta.icon;
                i += 1;
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.03 }}
                    className="relative"
                  >
                    <div className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full ${meta.color} ring-4 ring-neutral-950 flex items-center justify-center`}>
                      <Icon className="h-2.5 w-2.5 text-white" />
                    </div>
                    <p className="text-sm text-white">
                      <span className="text-indigo-400">{event.user_name || "System"}</span> {event.description}
                    </p>
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
