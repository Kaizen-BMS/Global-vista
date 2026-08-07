"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Menu } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useMobileNav } from "@/components/layout/MobileNavContext";

export default function PlatformTopbar({ session }) {
  const router = useRouter();
  const { setOpen } = useMobileNav();
  async function handleLogout() {
    await apiFetch("/api/core/auth/logout", { method: "POST" });
    toast.success("Logged out.");
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="h-16 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 gap-3 print:hidden">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={() => setOpen(true)} className="md:hidden text-neutral-400 hover:text-white cursor-pointer transition-colors shrink-0"><Menu className="h-5 w-5" /></button>
        <p className="text-neutral-500 text-xs truncate">{session?.name}</p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <ThemeToggle />
        <NotificationBell />
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white cursor-pointer transition-colors"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Logout</span></button>
      </div>
    </header>
  );
}
