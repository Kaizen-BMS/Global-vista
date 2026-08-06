"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Menu } from "lucide-react";
import NotificationBell from "@/components/crm/notifications/NotificationBell";
import GlobalSearch from "@/components/crm/shared/GlobalSearch";
import { apiFetch } from "@/components/crm/shared/apiClient";

export default function Topbar({ session }) {
  const router = useRouter();

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out.");
    router.push("/login");
    router.refresh();
  }

  function openMobileSidebar() {
    if (typeof window !== "undefined" && window.__gvCrmOpenSidebar) window.__gvCrmOpenSidebar();
  }

  return (
    <header className="h-16 shrink-0 sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button onClick={openMobileSidebar} className="text-neutral-400 hover:text-white md:hidden"><Menu className="h-5 w-5" /></button>
        <div className="hidden sm:block flex-1 max-w-md"><GlobalSearch /></div>
      </div>
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        <NotificationBell />
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition">
          <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}