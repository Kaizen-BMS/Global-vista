"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatDateTime } from "@/lib/helpers/dateFormat";

/** Same collapse/rotate chevron pattern as FollowupDashboard's section
 * headers — one group of activity-log rows, collapsed or expanded. */
export default function CollapsibleLogGroup({ title, logs, timezone, hour12, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (logs.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/40 transition">
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground text-xs">({logs.length})</span>
      </button>
      {open && (
        <div className="divide-y divide-border border-t border-border">
          {logs.map((l) => (
            <div key={l.id} className="px-4 py-3 flex justify-between">
              <p className="text-foreground text-sm"><span className="text-indigo-400">{l.user_name || "System"}</span> {l.description}</p>
              <span className="text-muted-foreground text-xs">{formatDateTime(l.created_at, timezone, { hour12 })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
