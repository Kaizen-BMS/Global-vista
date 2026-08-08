"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, UserX, UserCheck, Pencil, Unlock, Trash2, Users as UsersIcon, Eye } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import DataTable from "@/components/shared/DataTable";
import EditUserDialog from "@/components/dialogs/EditUserDialog";
import { apiFetch } from "@/components/shared/apiClient";

const STATUS_STYLES = { active: "bg-green-500/10 text-green-400 border-green-500/30", inactive: "bg-muted/20 text-muted-foreground border-border/30", suspended: "bg-orange-500/10 text-orange-400 border-orange-500/30" };

export default function UsersTable({ users, roles, canManage, canUnlock, isSuperAdmin, viewingDeleted = false }) {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function setStatus(user, status) {
    setBusyId(user.id);
    try {
      const res = await apiFetch(`/api/core/users/${user.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_status", status }) });
      if (!res.ok) throw new Error();
      toast.success(`Set to ${status}.`); router.refresh();
    } catch { toast.error("Failed."); } finally { setBusyId(null); setOpenMenuId(null); }
  }
  async function unlockUser(user) {
    setBusyId(user.id);
    try { const res = await apiFetch(`/api/core/users/${user.id}/unlock`, { method: "POST" }); if (!res.ok) throw new Error(); toast.success("Unlocked."); router.refresh(); }
    catch { toast.error("Failed."); } finally { setBusyId(null); setOpenMenuId(null); }
  }
  async function deleteUserRow(user) {
    if (!confirm(`Delete ${user.name}?`)) return;
    setBusyId(user.id);
    try { const res = await apiFetch(`/api/core/users/${user.id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success("Deleted."); router.refresh(); }
    catch { toast.error("Failed."); } finally { setBusyId(null); setOpenMenuId(null); }
  }

  if (users.length === 0) return <EmptyState icon={UsersIcon} title="No users found" />;

  const columns = [
    {
      key: "name", label: "Name", width: 200, hideable: false,
      render: (u) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Link href={`/workspace/users/${u.id}`} className="text-foreground hover:text-indigo-400 font-medium">{u.name}</Link>
          {u.locked_until && new Date(u.locked_until) > new Date() && <span className="ml-2 text-[10px] text-red-400">LOCKED</span>}
        </span>
      ),
    },
    { key: "email", label: "Email", width: 220, render: (u) => u.email },
    { key: "role_name", label: "Role", width: 140, render: (u) => u.role_name },
    { key: "status", label: "Status", width: 110, render: (u) => <span className={`text-xs px-2 py-1 rounded-md border ${STATUS_STYLES[u.status] || STATUS_STYLES.inactive}`}>{u.status}</span> },
  ];

  return (
    <>
      <DataTable
        tableId="users"
        columns={columns}
        rows={users}
        rowContextMenuItems={canManage ? (u) => [
          { label: "View Profile", icon: Eye, onClick: () => router.push(`/workspace/users/${u.id}`) },
          { label: "Edit", icon: Pencil, onClick: () => setEditingUser(u) },
          ...(!u.is_super_admin ? [{ label: u.status === "active" ? "Deactivate" : "Activate", icon: u.status === "active" ? UserX : UserCheck, onClick: () => setStatus(u, u.status === "active" ? "inactive" : "active") }] : []),
          ...(u.locked_until && new Date(u.locked_until) > new Date() && canUnlock ? [{ label: "Unlock", icon: Unlock, onClick: () => unlockUser(u) }] : []),
          ...(isSuperAdmin && !u.is_super_admin ? [{ label: "Delete", icon: Trash2, danger: true, onClick: () => deleteUserRow(u) }] : []),
        ] : undefined}
        leadingColumn={canManage ? {
          width: 40,
          headerRender: () => null,
          render: (u) => (
            <div className="relative">
              <button onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)} disabled={busyId === u.id} className="text-muted-foreground hover:text-foreground cursor-pointer"><MoreVertical className="h-4 w-4" /></button>
              {openMenuId === u.id && (
                <div className="absolute left-0 top-8 z-20 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                  <button onClick={() => { setEditingUser(u); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer"><Pencil className="h-3.5 w-3.5" />Edit</button>
                  {!u.is_super_admin && <button onClick={() => setStatus(u, u.status === "active" ? "inactive" : "active")} disabled={busyId === u.id} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer">{u.status === "active" ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}{u.status === "active" ? "Deactivate" : "Activate"}</button>}
                  {u.locked_until && new Date(u.locked_until) > new Date() && canUnlock && <button onClick={() => unlockUser(u)} disabled={busyId === u.id} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-muted cursor-pointer"><Unlock className="h-3.5 w-3.5" />Unlock</button>}
                  {isSuperAdmin && !u.is_super_admin && <button onClick={() => deleteUserRow(u)} disabled={busyId === u.id} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-muted border-t border-border cursor-pointer"><Trash2 className="h-3.5 w-3.5" />Delete</button>}
                </div>
              )}
            </div>
          ),
        } : undefined}
      />
      {editingUser && <EditUserDialog user={editingUser} roles={roles} onClose={() => setEditingUser(null)} />}
    </>
  );
}
