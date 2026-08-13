"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, CornerDownLeft, Plus } from "lucide-react";
import { ICON_MAP, PLATFORM_NAV_ITEMS, ALL_NAV_ITEMS } from "@/lib/constants/navItems";

const PLATFORM_CREATE_ITEMS = [
  { href: "/platform/companies", label: "New Company", icon: "Building2", group: "Create" },
];
const WORKSPACE_CREATE_ITEMS = [
  { href: "/workspace/lead-management/new", label: "New Lead", icon: "Contact2", group: "Create" },
  { href: "/workspace/lead-forms/new", label: "New Query Form", icon: "ClipboardList", group: "Create" },
  { href: "/workspace/users", label: "New User", icon: "Users", group: "Create" },
];

export default function CommandPalette({ scope }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const navItems = scope === "platform" ? PLATFORM_NAV_ITEMS : ALL_NAV_ITEMS;
  const createItems = scope === "platform" ? PLATFORM_CREATE_ITEMS : WORKSPACE_CREATE_ITEMS;
  const allItems = useMemo(
    () => [...createItems, ...navItems.map((i) => ({ ...i, group: "Go to" }))],
    [navItems, createItems]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [allItems, query]);

  useEffect(() => {
    function onKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, []);

  useEffect(() => { if (open) { setQuery(""); setActiveIndex(0); } }, [open]);
  useEffect(() => { setActiveIndex(0); }, [query]);

  function go(href) {
    setOpen(false);
    router.push(href);
  }

  function handleKeyDown(e) {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => (i + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => (i - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); const r = results[activeIndex]; if (r) go(r.href); }
  }

  let runningIndex = -1;
  const groups = results.reduce((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15 }}
            role="dialog" aria-modal="true" aria-label="Command palette"
            className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="relative flex items-center border-b border-border">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="w-full pl-10 pr-4 py-3.5 bg-transparent text-popover-foreground text-sm focus:outline-none"
              />
            </div>
            <div className="max-h-80 overflow-y-auto py-2">
              {results.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No matching commands.</p>}
              {Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <p className="px-3.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                  {items.map((item) => {
                    runningIndex += 1;
                    const isActive = runningIndex === activeIndex;
                    const Icon = item.group === "Create" ? Plus : ICON_MAP[item.icon];
                    return (
                      <button
                        key={`${item.group}-${item.href}`}
                        onMouseEnter={() => setActiveIndex(runningIndex)}
                        onClick={() => go(item.href)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2 text-left cursor-pointer transition-colors ${isActive ? "bg-indigo-500/10" : "hover:bg-accent"}`}
                      >
                        {Icon && <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-400" : "text-muted-foreground"}`} />}
                        <span className="flex-1 text-sm text-popover-foreground">{item.label}</span>
                        {isActive && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 px-3.5 py-2 border-t border-border text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border">Enter</kbd> Select</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border">Esc</kbd> Close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
