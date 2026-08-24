"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/workspace/settings/branding", label: "Branding" }, { href: "/workspace/settings/email", label: "Email" },
  { href: "/workspace/settings/notifications", label: "Notifications" }, { href: "/workspace/settings/system", label: "System" },
  { href: "/workspace/settings/organization", label: "Organization" },
  { href: "/workspace/settings/geography", label: "Geography" }, { href: "/workspace/settings/lead-sources", label: "Lead Sources" },
  { href: "/workspace/settings/services", label: "Services" }, { href: "/workspace/settings/document-types", label: "Employee Document Types" },
  { href: "/workspace/settings/lead-document-types", label: "Lead Document Types" }, { href: "/workspace/settings/lead-fields", label: "Lead Fields" },
  { href: "/workspace/settings/integrations", label: "Integrations" },
  { href: "/workspace/settings/payments", label: "Payments" },
  { href: "/workspace/settings/subscription", label: "Subscription" },
  { href: "/workspace/support", label: "Support & Feedback" },
];
export default function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-3">
      {TABS.map((t) => <Link key={t.href} href={t.href} className={`text-sm px-3 py-1.5 rounded-md transition ${pathname === t.href ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/30" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}>{t.label}</Link>)}
    </div>
  );
}