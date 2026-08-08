"use client";
import { Menu } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useMobileNav } from "@/components/layout/MobileNavContext";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import QuickCreateButton from "@/components/layout/QuickCreateButton";
import UserMenu from "@/components/layout/UserMenu";
import CommandPalette from "@/components/layout/CommandPalette";

export default function PlatformTopbar({ session }) {
  const { setOpen } = useMobileNav();
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 gap-3 print:hidden">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={() => setOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"><Menu className="h-5 w-5" /></button>
        <Breadcrumbs scope="platform" />
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <QuickCreateButton scope="platform" />
        <ThemeToggle />
        <NotificationBell />
        <div className="w-px h-6 bg-border mx-0.5 hidden sm:block" />
        <UserMenu session={session} scope="platform" />
      </div>
      <CommandPalette scope="platform" />
    </header>
  );
}
