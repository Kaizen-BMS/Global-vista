"use client";
import { Sun, Moon, Check } from "lucide-react";
import { useTheme } from "@/components/shared/ThemeProvider";

const OPTIONS = [
  { key: "light", label: "Light", icon: Sun, desc: "Cool light workspace, dark navy sidebar" },
  { key: "dark", label: "Dark", icon: Moon, desc: "Deep navy, layered dark surfaces" },
];

export default function ProfileThemeControl() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = theme === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setTheme(o.key)}
            className={`relative flex items-start gap-3 rounded-xl border p-4 text-left transition cursor-pointer ${active ? "border-indigo-500/50 bg-indigo-500/5" : "border-border bg-muted/30 hover:border-indigo-500/30"}`}
          >
            <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${active ? "bg-indigo-500/15 text-indigo-400" : "bg-muted text-muted-foreground"}`}><Icon className="h-4.5 w-4.5" /></div>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">{o.label}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{o.desc}</p>
            </div>
            {active && <Check className="h-4 w-4 text-indigo-400 absolute top-3 right-3" />}
          </button>
        );
      })}
    </div>
  );
}
