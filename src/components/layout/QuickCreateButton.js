"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ICON_MAP } from "@/lib/constants/navItems";
import FloatingPanel from "@/components/shared/FloatingPanel";

const PLATFORM_ITEMS = [{ href: "/platform/companies", label: "New Company", icon: "Building2" }];
const WORKSPACE_ITEMS = [
  { href: "/workspace/lead-management/new", label: "New Lead", icon: "Contact2" },
  { href: "/workspace/lead-forms/new", label: "New Query Form", icon: "ClipboardList" },
  { href: "/workspace/users", label: "New User", icon: "Users" },
];

export default function QuickCreateButton({ scope }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const items = scope === "platform" ? PLATFORM_ITEMS : WORKSPACE_ITEMS;

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        onClick={() => setOpen((o) => !o)}
        title="Quick create"
        aria-label="Quick create"
        className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted hover:bg-accent text-foreground transition cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </button>
      <FloatingPanel anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} width={192} className="p-1">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-popover-foreground/80 hover:bg-accent hover:text-popover-foreground transition-colors cursor-pointer"
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </Link>
          );
        })}
      </FloatingPanel>
    </div>
  );
}
