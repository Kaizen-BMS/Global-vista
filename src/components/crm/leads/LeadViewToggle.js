"use client";
import Link from "next/link";
import { List, Kanban, CalendarDays } from "lucide-react";

const VIEWS = [
  { key: "list", label: "List", icon: List, href: "/workspace/lead-management" },
  { key: "kanban", label: "Kanban", icon: Kanban, href: "/workspace/lead-management/kanban" },
  { key: "calendar", label: "Calendar", icon: CalendarDays, href: "/workspace/lead-management/calendar" },
];

export default function LeadViewToggle({ active }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border">
      {VIEWS.map((v) => {
        const Icon = v.icon;
        const isActive = v.key === active;
        return (
          <Link
            key={v.key}
            href={v.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition cursor-pointer ${isActive ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          >
            <Icon className="h-3.5 w-3.5" /> {v.label}
          </Link>
        );
      })}
    </div>
  );
}
