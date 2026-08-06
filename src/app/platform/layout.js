import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isPlatformOperator } from "@/lib/helpers/permissions";
import Link from "next/link";
import { Building2, Package, Activity, Settings, LayoutDashboard, ScrollText } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const NAV = [
  { href: "/platform", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platform/companies", label: "Companies", icon: Building2 },
  { href: "/platform/modules", label: "Modules", icon: Package },
  { href: "/platform/activity-logs", label: "Activity Logs", icon: ScrollText },
  { href: "/platform/system-health", label: "System Health", icon: Activity },
  { href: "/platform/settings", label: "Settings", icon: Settings },
];

export default async function PlatformLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isPlatformOperator(session)) redirect("/workspace/dashboard");

  return (
    <div className="min-h-screen bg-black flex">
      <aside className="hidden md:flex w-56 shrink-0 bg-neutral-950 border-r border-neutral-800 flex-col">
        <div className="px-5 py-5 border-b border-neutral-800"><p className="text-white font-semibold">Global Vista</p><p className="text-neutral-500 text-xs">Platform Console</p></div>
        <nav className="flex-1 px-3 py-4 space-y-1">{NAV.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:bg-neutral-900 hover:text-white"><Icon className="h-4 w-4" />{label}</Link>)}</nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-neutral-900 px-6 flex items-center justify-between"><p className="text-neutral-500 text-xs">{session.name}</p></header>
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}