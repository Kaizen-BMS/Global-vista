"use client";
import { Menu } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import GlobalSearch from "@/components/shared/GlobalSearch";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useMobileNav } from "@/components/layout/MobileNavContext";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AiSearchButton from "@/components/layout/AiSearchButton";
import QuickCreateButton from "@/components/layout/QuickCreateButton";
import UserMenu from "@/components/layout/UserMenu";
import CommandPalette from "@/components/layout/CommandPalette";

export default function Topbar({ company, session }) {
  const { setOpen } = useMobileNav();
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 gap-3 print:hidden">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button onClick={() => setOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"><Menu className="h-5 w-5" /></button>
        <Breadcrumbs scope="workspace" />
        <div className="hidden sm:block flex-1 max-w-md ml-auto"><GlobalSearch /></div>
      </div>
      {company?.name && <p className="hidden lg:block text-muted-foreground text-xs truncate max-w-[220px]">{company.name}</p>}
      <div className="flex items-center gap-2.5 shrink-0">
        <AiSearchButton />
        <QuickCreateButton scope="workspace" />
        <ThemeToggle />
        <NotificationBell />
        <div className="w-px h-6 bg-border mx-0.5 hidden sm:block" />
        <UserMenu session={session} scope="workspace" />
      </div>
      <CommandPalette scope="workspace" />
    </header>
  );
}
