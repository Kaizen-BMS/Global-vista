"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { X, PanelLeftClose, PanelLeftOpen, Pin, PinOff } from "lucide-react";
import { ICON_MAP } from "@/lib/constants/navItems";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import { useMobileNav } from "@/components/layout/MobileNavContext";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import SidebarTooltip from "@/components/layout/SidebarTooltip";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

/** A pulsing ring behind a solid core — CSS-only, no re-render cost — reads
 * as "something just happened here" without being loud enough to make the
 * row feel like an alert. Absolutely positioned in both states, so growing
 * from 0 to a real count never shifts surrounding layout. */
function NotificationDot({ count, collapsed }) {
  if (!count) return null;
  const label = `${count} unread`;
  if (collapsed) {
    return (
      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2" role="status" aria-label={label}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
    );
  }
  return (
    <span
      role="status"
      aria-label={label}
      className="ml-auto shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function NavLink({ href, label, icon, active, collapsed, primaryColor, onNavigate, pinned, onTogglePin, showPin, badgeCount = 0 }) {
  const Icon = ICON_MAP[icon];
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group/link relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${collapsed ? "justify-center" : ""} ${active ? "text-indigo-400 dark:text-indigo-400" : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5"}`}
      style={active ? { backgroundColor: `${primaryColor}1a`, border: `1px solid ${primaryColor}4d` } : undefined}
    >
      <span className="relative shrink-0">
        {Icon && <Icon className="h-4 w-4" />}
        {collapsed && <NotificationDot count={badgeCount} collapsed />}
      </span>
      {!collapsed && <span className="truncate flex-1">{label}</span>}
      {!collapsed && <NotificationDot count={badgeCount} />}
      {!collapsed && showPin && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(href); }}
          title={pinned ? "Unpin" : "Pin to top"}
          className={`shrink-0 text-muted-foreground hover:text-sidebar-foreground cursor-pointer transition-opacity ${pinned ? "opacity-100" : "opacity-0 group-hover/link:opacity-100"}`}
        >
          {pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
        </button>
      )}
    </Link>
  );
  return collapsed ? <SidebarTooltip label={label}>{link}</SidebarTooltip> : link;
}

// Which nav href gets a dot for which badge count — extend this map if more
// sections grow their own unread concept later, rather than hardcoding
// per-item checks throughout the render. There is no standalone "Payments"
// nav item in the current sidebar IA (payments live inside Lead Detail and
// Settings), so the `payments` count folds into the Notifications bell's
// `totalUnread` rather than a dot with nowhere real to attach to.
const DOT_HREFS = {
  "/workspace/lead-management": "leads",
  "/workspace/followups": "followups",
  "/workspace/notifications": "totalUnread",
  "/workspace/messages": "messages",
  "/workspace/support": "support",
  "/workspace/documents": "documents",
};

// ONE endpoint drives every sidebar dot — /api/core/notifications/badges
// (backed by getSidebarBadgeCounts) fans out server-side to the handful of
// already-scoped queries this needs, so the client makes exactly one
// request per poll instead of one per nav item.
function useSidebarBadges(scope) {
  const [badges, setBadges] = useState({ totalUnread: 0, leads: 0, followups: 0, messages: 0, payments: 0, complaints: 0, ideas: 0, support: 0, documents: 0 });
  useEffect(() => {
    if (scope !== "workspace") return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/core/notifications/badges");
        if (cancelled || !res.ok) return;
        setBadges(await res.json());
      } catch { /* next poll retries */ }
    }
    load();
    const id = setInterval(load, 20000);
    window.addEventListener("gv:badges:refresh", load);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("gv:badges:refresh", load); };
  }, [scope]);
  return badges;
}

/** Call after an action that should clear a dot sooner than the next 20s
 * poll (marking a notification read, sending/reading a message, completing
 * a follow-up) — dispatched as a DOM event rather than a shared store so
 * call sites don't need any new import/context wiring. */
export function refreshSidebarBadges() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("gv:badges:refresh"));
}

function SidebarContent({ session, navItems, company, showPoweredBy, onNavigate, collapsed, onToggleCollapse, showToggle, scope }) {
  const pathname = usePathname();
  const badges = useSidebarBadges(scope);
  const logoUrl = company?.sidebar_logo_url || company?.logo_url;
  // The upload succeeding and the file still being servable are different
  // things (deploy without persistent storage, cleared /public/uploads,
  // etc.) — an <img> with no onError just shows the browser's broken-image
  // icon forever. Track load failure per URL so a real logo still renders
  // once it's set to a working src.
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => { setLogoFailed(false); }, [logoUrl]);
  const logo = logoFailed ? null : logoUrl;
  const primaryColor = company?.primary_color || "#4f46e5";
  const [pinned, setPinned] = useLocalStorageState(`gv:${scope}:pinnedNav`, []);

  function togglePin(href) {
    setPinned((prev) => (prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]));
  }

  const pinnedItems = navItems.filter((i) => pinned.includes(i.href));
  const restItems = navItems.filter((i) => !pinned.includes(i.href));

  const allHrefs = navItems.map((i) => i.href);
  function isActive(href) {
    if (pathname === href) return true;
    // A nav item whose href is itself a path-prefix of a sibling item's href
    // (e.g. "/platform" is a prefix of "/platform/companies") is that sibling's
    // ancestor, not a distinct section — it must only ever match exactly, or it
    // would stay "active" on every nested route underneath it.
    const isAncestorOfSibling = allHrefs.some((h) => h !== href && h.startsWith(`${href}/`));
    if (isAncestorOfSibling) return false;
    return pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <div className={`border-b border-sidebar-border ${collapsed ? "px-3 py-4 flex flex-col items-center gap-3" : "px-4 py-4 flex items-center justify-between gap-2"}`}>
        <div className={`flex items-center gap-3 min-w-0 ${collapsed ? "" : "flex-1"}`}>
          {logo ? (
            <img src={logo} alt="" width={32} height={32} onError={() => setLogoFailed(true)} className="h-8 w-8 rounded object-contain shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded flex items-center justify-center font-semibold text-white shrink-0" style={{ backgroundColor: primaryColor }}>{(company?.short_name || company?.name || "W").charAt(0)}</div>
          )}
          {!collapsed && <div className="min-w-0"><p className="text-sidebar-foreground font-semibold text-sm truncate">{company?.name || "Workspace"}</p></div>}
        </div>
        {showToggle && (
          <button
            onClick={onToggleCollapse}
            title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl+B)`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:flex items-center justify-center h-7 w-7 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer transition-colors shrink-0"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {pinnedItems.length > 0 && (
          <>
            {!collapsed && <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-1">Pinned</p>}
            {pinnedItems.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} primaryColor={primaryColor} onNavigate={onNavigate} pinned onTogglePin={togglePin} showPin badgeCount={badges[DOT_HREFS[item.href]] || 0} />
            ))}
            {!collapsed && <div className="h-px bg-sidebar-border my-2 mx-1" />}
          </>
        )}
        {restItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} primaryColor={primaryColor} onNavigate={onNavigate} pinned={false} onTogglePin={togglePin} showPin badgeCount={badges[DOT_HREFS[item.href]] || 0} />
        ))}
      </nav>

      {!collapsed && (
        <div className="px-5 py-4 border-t border-sidebar-border">
          <p className="text-sidebar-foreground/80 text-sm truncate">{session?.name}</p>
          {showPoweredBy && <p className="text-sidebar-foreground/30 text-[10px] mt-1">{GLOBAL_VISTA_BRANDING.poweredByLabel}</p>}
        </div>
      )}
    </>
  );
}

const SIDEBAR_COLLAPSED_KEY = "gv:sidebarCollapsed";

export default function Sidebar({ session, navItems, company, showPoweredBy = true, scope = "workspace" }) {
  const { open, setOpen } = useMobileNav();
  const [collapsed, setCollapsed, hydrated] = useLocalStorageState(SIDEBAR_COLLAPSED_KEY, false);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Tablets get less horizontal room than desktop, so default to the
  // icon-only rail there — but only if the user hasn't already chosen a
  // state explicitly (their choice always wins over this default).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) !== null) return;
    } catch { return; }
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    if (isTablet) setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ctrl+B / Cmd+B toggles the sidebar, same shortcut as Vercel/Linear/Notion.
  useEffect(() => {
    function onKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <motion.aside
        animate={{ width: hydrated && collapsed ? 76 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex shrink-0 bg-sidebar border-r border-sidebar-border flex-col print:hidden overflow-hidden"
      >
        <SidebarContent session={session} navItems={navItems} company={company} showPoweredBy={showPoweredBy} collapsed={hydrated && collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} showToggle scope={scope} />
      </motion.aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)} />
          <ModalFocusTrap>
          <aside role="dialog" aria-modal="true" aria-label="Navigation" className="relative w-72 max-w-[80vw] h-full bg-sidebar border-r border-sidebar-border flex flex-col animate-in slide-in-from-left duration-200">
            <button onClick={() => setOpen(false)} aria-label="Close navigation" className="absolute top-4 right-4 text-sidebar-foreground/50 hover:text-sidebar-foreground cursor-pointer transition-colors"><X className="h-5 w-5" /></button>
            <SidebarContent session={session} navItems={navItems} company={company} showPoweredBy={showPoweredBy} onNavigate={() => setOpen(false)} collapsed={false} onToggleCollapse={() => {}} showToggle={false} scope={scope} />
          </aside>
          </ModalFocusTrap>
        </div>
      )}
    </>
  );
}
