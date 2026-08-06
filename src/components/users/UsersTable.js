"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, UserX, UserCheck, Pencil, Unlock, Trash2, Users as UsersIcon } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import EditUserDialog from "@/components/dialogs/EditUserDialog";
import { apiFetch } from "@/components/shared/apiClient";

const STATUS_STYLES = { active: "bg-green-500/10 text-green-400 border-green-500/30", inactive: "bg-neutral-700/20 text-neutral-400 border-neutral-600/30", suspended: "bg-orange-500/10 text-orange-400 border-orange-500/30" };

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

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-neutral-500 border-b border-neutral-800">
          <th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 w-10"></th>
        </tr></thead>
        <tbody>
          {users.map((u) => {
            const locked = u.locked_until && new Date(u.locked_until) > new Date();
            return (
              <tr key={u.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/30">
                <td className="px-4 py-3"><Link href={`/workspace/users/${u.id}`} className="text-white hover:text-indigo-400 font-medium">{u.name}</Link>{locked && <span className="ml-2 text-[10px] text-red-400">LOCKED</span>}</td>
                <td className="px-4 py-3 text-neutral-300">{u.email}</td>
                <td className="px-4 py-3 text-neutral-300">{u.role_name}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-md border ${STATUS_STYLES[u.status] || STATUS_STYLES.inactive}`}>{u.status}</span></td>
                <td className="px-4 py-3 relative">
                  {canManage && (
                    <>
                      <button onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)} className="text-neutral-500 hover:text-white"><MoreVertical className="h-4 w-4" /></button>
                      {openMenuId === u.id && (
                        <div className="absolute right-4 top-10 z-20 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
                          <button onClick={() => { setEditingUser(u); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"><Pencil className="h-3.5 w-3.5" />Edit</button>
                          {!u.is_super_admin && <button onClick={() => setStatus(u, u.status === "active" ? "inactive" : "active")} disabled={busyId === u.id} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800">{u.status === "active" ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}{u.status === "active" ? "Deactivate" : "Activate"}</button>}
                          {locked && canUnlock && <button onClick={() => unlockUser(u)} disabled={busyId === u.id} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-neutral-800"><Unlock className="h-3.5 w-3.5" />Unlock</button>}
                          {isSuperAdmin && !u.is_super_admin && <button onClick={() => deleteUserRow(u)} disabled={busyId === u.id} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-neutral-800 border-t border-neutral-800"><Trash2 className="h-3.5 w-3.5" />Delete</button>}
                        </div>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {editingUser && <EditUserDialog user={editingUser} roles={roles} onClose={() => setEditingUser(null)} />}
    </div>
  );
}