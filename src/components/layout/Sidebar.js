"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { ICON_MAP } from "@/lib/constants/navItems";
import { useMobileNav } from "@/components/layout/MobileNavContext";

function SidebarContent({ session, navItems, company, showPoweredBy, onNavigate }) {
  const pathname = usePathname();
  const logo = company?.sidebar_logo_url || company?.logo_url;
  return (
    <>
      <div className="px-5 py-5 border-b border-neutral-800 flex items-center gap-3">
        {logo ? <img src={logo} alt="" className="h-8 w-8 rounded object-contain" /> : <div className="h-8 w-8 rounded flex items-center justify-center font-semibold text-white shrink-0" style={{ backgroundColor: company?.primary_color || "#4f46e5" }}>{(company?.short_name || company?.name || "W").charAt(0)}</div>}
        <div className="min-w-0"><p className="text-white font-semibold text-sm truncate">{company?.name || "Workspace"}</p></div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon }) => { const Icon = ICON_MAP[icon]; const active = pathname === href || pathname.startsWith(`${href}/`); return (
          <Link key={href} href={href} onClick={onNavigate} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${active ? "text-indigo-400" : "text-neutral-400 hover:bg-neutral-900 hover:text-white hover:translate-x-0.5"}`} style={active ? { backgroundColor: `${company?.primary_color || "#4f46e5"}1a`, border: `1px solid ${company?.primary_color || "#4f46e5"}4d` } : undefined}>
            {Icon && <Icon className="h-4 w-4 shrink-0" />}<span className="truncate">{label}</span>
          </Link>
        ); })}
      </nav>
      <div className="px-5 py-4 border-t border-neutral-800">
        <p className="text-neutral-300 text-sm truncate">{session?.name}</p>
        {showPoweredBy && <p className="text-neutral-700 text-[10px] mt-1">Powered by Global Vista</p>}
      </div>
    </>
  );
}

export default function Sidebar({ session, navItems, company, showPoweredBy = true }) {
  const { open, setOpen } = useMobileNav();
  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 bg-neutral-950 border-r border-neutral-800 flex-col print:hidden">
        <SidebarContent session={session} navItems={navItems} company={company} showPoweredBy={showPoweredBy} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)} />
          <aside className="relative w-72 max-w-[80vw] h-full bg-neutral-950 border-r border-neutral-800 flex flex-col animate-in slide-in-from-left duration-200">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white cursor-pointer transition-colors"><X className="h-5 w-5" /></button>
            <SidebarContent session={session} navItems={navItems} company={company} showPoweredBy={showPoweredBy} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
