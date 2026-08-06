"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import NotificationBell from "@/components/notifications/NotificationBell";
import GlobalSearch from "@/components/shared/GlobalSearch";

export default function Topbar({ company }) {
  const router = useRouter();
  async function handleLogout() {
    await apiFetch("/api/core/auth/logout", { method: "POST" });
    toast.success("Logged out.");
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="h-16 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 gap-3 print:hidden">
      <div className="hidden sm:block flex-1 max-w-md"><GlobalSearch /></div>
      {company?.name && <p className="hidden lg:block text-neutral-500 text-xs truncate max-w-[220px]">{company.name}</p>}
      <div className="flex items-center gap-4">
        <NotificationBell />
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white cursor-pointer transition-colors"><LogOut className="h-4 w-4" />Logout</button>
      </div>
    </header>
  );
}