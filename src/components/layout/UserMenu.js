"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, User, Settings, Check, Repeat, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import FloatingPanel from "@/components/shared/FloatingPanel";

export default function UserMenu({ session, scope = "workspace" }) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState(null);
  const [switching, setSwitching] = useState(null);
  const anchorRef = useRef(null);
  const router = useRouter();
  const initial = (session?.name || "?").charAt(0).toUpperCase();

  const loadRoles = useCallback(() => {
    if (!session?.id || scope !== "workspace") return;
    // Company roles for a permanent Super Admin, or just this user's own
    // assignments otherwise — the server decides which, never the client.
    apiFetch(`/api/core/session/available-roles`).then((r) => r.json()).then((d) => setRoles(d.roles || [])).catch(() => setRoles([]));
  }, [session?.id, scope]);

  useEffect(() => { if (open && roles === null) loadRoles(); }, [open, roles, loadRoles]);

  async function switchRole(roleId) {
    if (roleId === session?.role_id) return;
    setSwitching(roleId);
    try {
      const res = await apiFetch("/api/core/session/switch-role", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to switch role.");
      toast.success(`Switched to ${data.role.roleName}.`);
      setOpen(false);
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setSwitching(null); }
  }

  async function handleLogout() {
    await apiFetch("/api/core/auth/logout", { method: "POST" });
    toast.success("Logged out.");
    router.push("/login");
    router.refresh();
  }

  const settingsHref = scope === "platform" ? "/platform/settings" : "/workspace/settings";

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 cursor-pointer group"
        aria-label="User menu"
      >
        <div className="h-8 w-8 rounded-full bg-indigo-600/15 border border-indigo-600/30 flex items-center justify-center text-indigo-400 text-sm font-semibold shrink-0">{initial}</div>
        <span className="hidden lg:block text-sm text-foreground/80 group-hover:text-foreground transition-colors max-w-[140px] truncate">{session?.name}</span>
      </button>

      <FloatingPanel anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} width={224}>
        <div className="px-3.5 py-3 border-b border-border">
          <p className="text-popover-foreground text-sm font-medium truncate">{session?.name}</p>
          {session?.email && <p className="text-muted-foreground text-xs truncate mt-0.5">{session.email}</p>}
        </div>

        {roles && roles.length > 1 && (
          <div className="p-1 border-b border-border">
            <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5"><Repeat className="h-3 w-3" /> Switch Role</p>
            {roles.map((r) => (
              <button
                key={r.role_id}
                onClick={() => switchRole(r.role_id)}
                disabled={switching !== null}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm text-popover-foreground/80 hover:bg-accent hover:text-popover-foreground transition-colors cursor-pointer disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  {r.role_id === session?.role_id ? <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" /> : <span className="w-3.5 shrink-0" />}
                  {r.name}
                </span>
                {switching === r.role_id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </button>
            ))}
          </div>
        )}

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
      </FloatingPanel>
    </div>
  );
}
