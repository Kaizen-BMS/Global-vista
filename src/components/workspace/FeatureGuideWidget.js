"use client";
import { useEffect, useRef, useState } from "react";
import {
  HelpCircle, X, LayoutDashboard, Contact2, ClipboardList, CalendarClock, Phone, Wallet,
  BarChart3, Users, ShieldCheck, Settings, FileText, MessageSquare, MessageSquareWarning, ScrollText,
} from "lucide-react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

const ICONS = {
  LayoutDashboard, Contact2, ClipboardList, CalendarClock, Phone, Wallet,
  BarChart3, Users, ShieldCheck, Settings, FileText, MessageSquare, MessageSquareWarning, ScrollText,
};

/**
 * A small, always-out-of-the-way "Visual Guide" — fixed in the bottom-right
 * corner (empty real estate in this app; nothing else docks there), closed
 * by default so it never sits on top of page content. `entries` is already
 * filtered server-side (see guide.js's getVisibleGuideEntries) to exactly
 * what THIS user's role/permissions and THIS company's enabled modules
 * allow — an employee with fewer permissions simply sees a shorter list,
 * automatically, with no separate logic to keep in sync here.
 */
export default function FeatureGuideWidget({ entries }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useLocalStorageState("gv:featureGuideSeen", false);
  const panelRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (open && panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!entries || entries.length === 0) return null;

  function toggle() {
    setOpen((o) => !o);
    if (!seen) setSeen(true);
  }

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 z-30 print:hidden">
      {open && (
        <div
          role="dialog" aria-label="Feature guide"
          className="absolute bottom-14 right-0 w-80 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border sticky top-0 bg-card">
            <p className="text-sm font-medium text-foreground">Feature Guide</p>
            <button onClick={() => setOpen(false)} aria-label="Close guide" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-muted-foreground text-xs px-4 pt-3">A quick look at what's available to you right now.</p>
          <div className="p-3 space-y-1">
            {entries.map((e) => {
              const Icon = ICONS[e.icon];
              return (
                <div key={e.key} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted transition">
                  <span className="h-8 w-8 shrink-0 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    {Icon && <Icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground font-medium">{e.label}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{e.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={toggle}
        aria-label="Open feature guide"
        title="Feature guide"
        className="relative h-11 w-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-indigo-400 hover:border-indigo-500/40 cursor-pointer transition"
      >
        <HelpCircle className="h-5 w-5" />
        {!seen && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-card" />}
      </button>
    </div>
  );
}
