"use client";
import { ChevronDown } from "lucide-react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

/** Generic collapsible wrapper, persisted per browser (same convention as
 * CollapsibleLogGroup/FollowupDashboard) — `persistKey` is this section's
 * own stable identity, required for the same reason it's required there. */
export default function CollapsibleSection({ title, subtitle, persistKey, defaultOpen = false, children }) {
  const [open, setOpen] = useLocalStorageState(`gv:section:${persistKey}`, defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 mb-3 cursor-pointer group">
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-sm font-medium text-foreground">{title}</span>
        {subtitle && <span className="text-muted-foreground text-xs">{subtitle}</span>}
      </button>
      {open && children}
    </div>
  );
}
