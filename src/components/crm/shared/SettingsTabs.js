"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/workspace/settings/branding", label: "Branding" },
  { href: "/workspace/settings/email", label: "Email" },
  { href: "/workspace/settings/notifications", label: "Notifications" },
  { href: "/workspace/settings/system", label: "System" },
  { href: "/workspace/settings/organization", label: "Organization" },
  { href: "/workspace/settings/academic-sessions", label: "Academic Sessions" },
  { href: "/workspace/settings/geography", label: "Geography" },
  { href: "/workspace/settings/lead-sources", label: "Lead Sources" },
  { href: "/workspace/settings/services", label: "Services" },
];

export default function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-3">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href} className={`text-sm px-3 py-1.5 rounded-md transition ${active ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/30" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}