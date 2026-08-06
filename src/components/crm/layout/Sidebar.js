"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ICON_MAP } from "@/lib/constants/navItems";

function SidebarContent({ session, navItems, onNavigate }) {
  const pathname = usePathname();

  return (
    <>
      <div className="px-5 py-5 border-b border-neutral-800">
        <p className="text-white font-semibold text-lg">Global Vista</p>
        <p className="text-neutral-500 text-xs">CRM Console</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon }) => {
          const Icon = ICON_MAP[icon];
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active ? "bg-indigo-600/10 text-indigo-400" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg border border-indigo-600/30"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {Icon && <Icon className="h-4 w-4 relative z-10" />}
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-neutral-800">
        <p className="text-neutral-300 text-sm truncate">{session?.name}</p>
        <p className="text-neutral-500 text-xs truncate">
          {session?.is_super_admin ? "Super Admin" : session?.role_slug}
        </p>
      </div>
    </>
  );
}

export default function Sidebar({ session, navItems }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 bg-neutral-950 border-r border-neutral-800 flex-col">
        <SidebarContent session={session} navItems={navItems} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col z-50 md:hidden"
            >
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
              <SidebarContent session={session} navItems={navItems} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <MobileToggleListener setMobileOpen={setMobileOpen} />
    </>
  );
}

function MobileToggleListener({ setMobileOpen }) {
  if (typeof window !== "undefined") window.__gvCrmOpenSidebar = () => setMobileOpen(true);
  return null;
}