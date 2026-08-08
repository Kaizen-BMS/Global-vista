"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, User, Settings } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function UserMenu({ session, scope = "workspace" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();
  const initial = (session?.name || "?").charAt(0).toUpperCase();

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    await apiFetch("/api/core/auth/logout", { method: "POST" });
    toast.success("Logged out.");
    router.push("/login");
    router.refresh();
  }

  const settingsHref = scope === "platform" ? "/platform/settings" : "/workspace/settings";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 cursor-pointer group"
        aria-label="User menu"
      >
        <div className="h-8 w-8 rounded-full bg-indigo-600/15 border border-indigo-600/30 flex items-center justify-center text-indigo-400 text-sm font-semibold shrink-0">{initial}</div>
        <span className="hidden lg:block text-sm text-foreground/80 group-hover:text-foreground transition-colors max-w-[140px] truncate">{session?.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3.5 py-3 border-b border-border">
            <p className="text-popover-foreground text-sm font-medium truncate">{session?.name}</p>
            {session?.email && <p className="text-muted-foreground text-xs truncate mt-0.5">{session.email}</p>}
          </div>
          <div className="p-1">
            {scope === "workspace" && (
              <Link href="/workspace/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-popover-foreground/80 hover:bg-accent hover:text-popover-foreground transition-colors cursor-pointer">
                <User className="h-4 w-4" /> Profile
              </Link>
            )}
            <Link href={settingsHref} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-popover-foreground/80 hover:bg-accent hover:text-popover-foreground transition-colors cursor-pointer">
              <Settings className="h-4 w-4" /> Settings
            </Link>
          </div>
          <div className="p-1 border-t border-border">
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
