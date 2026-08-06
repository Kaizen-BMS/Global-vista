"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ICON_MAP } from "@/lib/constants/navItems";

export default function Sidebar({ session, navItems, company }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 shrink-0 bg-neutral-950 border-r border-neutral-800 flex-col print:hidden">
      <div className="px-5 py-5 border-b border-neutral-800 flex items-center gap-3">
        {company?.logo_url ? <img src={company.logo_url} alt="" className="h-8 w-8 rounded object-contain" /> : <div className="h-8 w-8 rounded flex items-center justify-center font-semibold text-white" style={{ backgroundColor: company?.primary_color || "#4f46e5" }}>{(company?.short_name || company?.name || "W").charAt(0)}</div>}
        <div><p className="text-white font-semibold text-sm truncate">{company?.name || "Workspace"}</p></div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon }) => { const Icon = ICON_MAP[icon]; const active = pathname.startsWith(href); return (
          <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${active ? "text-indigo-400" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"}`} style={active ? { backgroundColor: `${company?.primary_color || "#4f46e5"}1a`, border: `1px solid ${company?.primary_color || "#4f46e5"}4d` } : undefined}>
            {Icon && <Icon className="h-4 w-4" />}{label}
          </Link>
        ); })}
      </nav>
      <div className="px-5 py-4 border-t border-neutral-800"><p className="text-neutral-300 text-sm truncate">{session?.name}</p></div>
    </aside>
  );
}