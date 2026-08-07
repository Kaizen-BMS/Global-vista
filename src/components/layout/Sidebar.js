"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { X, ChevronsLeft, ChevronsRight, Pin, PinOff } from "lucide-react";
import { ICON_MAP } from "@/lib/constants/navItems";
import { useMobileNav } from "@/components/layout/MobileNavContext";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import SidebarTooltip from "@/components/layout/SidebarTooltip";

function NavLink({ href, label, icon, active, collapsed, primaryColor, onNavigate, pinned, onTogglePin, showPin }) {
  const Icon = ICON_MAP[icon];
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group/link relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${collapsed ? "justify-center" : ""} ${active ? "text-indigo-400" : "text-neutral-400 hover:bg-neutral-900 hover:text-white hover:translate-x-0.5"}`}
      style={active ? { backgroundColor: `${primaryColor}1a`, border: `1px solid ${primaryColor}4d` } : undefined}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {!collapsed && <span className="truncate flex-1">{label}</span>}
      {!collapsed && showPin && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(href); }}
          title={pinned ? "Unpin" : "Pin to top"}
          className={`shrink-0 text-neutral-600 hover:text-white cursor-pointer transition-opacity ${pinned ? "opacity-100" : "opacity-0 group-hover/link:opacity-100"}`}
        >
          {pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
        </button>
      )}
    </Link>
  );
  return collapsed ? <SidebarTooltip label={label}>{link}</SidebarTooltip> : link;
}

function SidebarContent({ session, navItems, company, showPoweredBy, onNavigate, collapsed, onToggleCollapse, scope }) {
  const pathname = usePathname();
  const logo = company?.sidebar_logo_url || company?.logo_url;
  const primaryColor = company?.primary_color || "#4f46e5";
  const [pinned, setPinned] = useLocalStorageState(`gv:${scope}:pinnedNav`, []);

  function togglePin(href) {
    setPinned((prev) => (prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]));
  }

  const pinnedItems = navItems.filter((i) => pinned.includes(i.href));
  const restItems = navItems.filter((i) => !pinned.includes(i.href));

  function isActive(href) { return pathname === href || pathname.startsWith(`${href}/`); }

  return (
    <>
      <div className={`px-5 py-5 border-b border-neutral-800 flex items-center gap-3 ${collapsed ? "justify-center px-3" : ""}`}>
        {logo ? <img src={logo} alt="" className="h-8 w-8 rounded object-contain shrink-0" /> : <div className="h-8 w-8 rounded flex items-center justify-center font-semibold text-white shrink-0" style={{ backgroundColor: primaryColor }}>{(company?.short_name || company?.name || "W").charAt(0)}</div>}
        {!collapsed && <div className="min-w-0"><p className="text-white font-semibold text-sm truncate">{company?.name || "Workspace"}</p></div>}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {pinnedItems.length > 0 && (
          <>
            {!collapsed && <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">Pinned</p>}
            {pinnedItems.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} primaryColor={primaryColor} onNavigate={onNavigate} pinned onTogglePin={togglePin} showPin />
            ))}
            {!collapsed && <div className="h-px bg-neutral-800 my-2 mx-1" />}
          </>
        )}
        {restItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} primaryColor={primaryColor} onNavigate={onNavigate} pinned={false} onTogglePin={togglePin} showPin />
        ))}
      </nav>

      <div className={`px-5 py-4 border-t border-neutral-800 ${collapsed ? "px-3" : ""}`}>
        {!collapsed && (
          <>
            <p className="text-neutral-300 text-sm truncate">{session?.name}</p>
            {showPoweredBy && <p className="text-neutral-700 text-[10px] mt-1">Powered by Global Vista</p>}
          </>
        )}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`hidden md:flex items-center gap-2 text-neutral-500 hover:text-white text-xs cursor-pointer transition-colors mt-3 ${collapsed ? "justify-center w-full" : ""}`}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
      </div>
    </>
  );
}

export default function Sidebar({ session, navItems, company, showPoweredBy = true, scope = "workspace" }) {
  const { open, setOpen } = useMobileNav();
  const [collapsed, setCollapsed, hydrated] = useLocalStorageState("gv:sidebarCollapsed", false);

  return (
    <>
      <motion.aside
        animate={{ width: hydrated && collapsed ? 76 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex shrink-0 bg-neutral-950 border-r border-neutral-800 flex-col print:hidden overflow-hidden"
      >
        <SidebarContent session={session} navItems={navItems} company={company} showPoweredBy={showPoweredBy} collapsed={hydrated && collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} scope={scope} />
      </motion.aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)} />
          <aside className="relative w-72 max-w-[80vw] h-full bg-neutral-950 border-r border-neutral-800 flex flex-col animate-in slide-in-from-left duration-200">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white cursor-pointer transition-colors"><X className="h-5 w-5" /></button>
            <SidebarContent session={session} navItems={navItems} company={company} showPoweredBy={showPoweredBy} onNavigate={() => setOpen(false)} collapsed={false} onToggleCollapse={() => {}} scope={scope} />
          </aside>
        </div>
      )}
    </>
  );
}
