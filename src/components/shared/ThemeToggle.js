"use client";
import { useState, useRef, useEffect } from "react";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "@/components/shared/ThemeProvider";

const OPTIONS = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const Current = OPTIONS.find((o) => o.key === theme)?.icon || Moon;

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        title="Change theme"
        className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
      >
        <Current className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-36 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden p-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            const active = theme === o.key;
            return (
              <button
                key={o.key}
                onClick={() => { setTheme(o.key); setOpen(false); }}
                className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors ${active ? "bg-indigo-500/10 text-indigo-400" : "text-popover-foreground/70 hover:bg-accent hover:text-popover-foreground"}`}
              >
                <Icon className="h-4 w-4" /> {o.label}
                {active && <Check className="h-3.5 w-3.5 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
