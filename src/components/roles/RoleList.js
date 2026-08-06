"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ShieldCheck, Trash2, Pencil, Users } from "lucide-react";
import RoleFormDialog from "@/components/dialogs/RoleFormDialog";
import ReassignRoleDialog from "@/components/dialogs/ReassignRoleDialog";
import EmptyState from "@/components/shared/EmptyState";
import { apiFetch } from "@/components/shared/apiClient";

export default function RoleList({ roles }) {
  const router = useRouter();
  const [dialogRole, setDialogRole] = useState(undefined);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(role) {
    if (role.is_system) return;
    if (role.user_count > 0) { setReassignTarget(role); return; }
    if (!confirm(`Delete "${role.name}"?`)) return;
    setDeletingId(role.id);
    try { const res = await apiFetch(`/api/core/roles/${role.id}`, { method: "DELETE" }); const data = await res.json(); if (!res.ok) throw new Error(data.error); toast.success("Deleted."); router.refresh(); }
    catch (e) { toast.error(e.message || "Failed."); } finally { setDeletingId(null); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4"><button onClick={() => setDialogRole(null)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"><Plus className="h-4 w-4" />Create Role</button></div>
      {roles.length === 0 ? <EmptyState icon={ShieldCheck} title="No roles yet" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-2"><p className="text-white font-medium">{role.name}</p><ShieldCheck className="h-4 w-4 text-neutral-600" /></div>
              <p className="flex items-center gap-1.5 text-neutral-500 text-xs mb-4"><Users className="h-3.5 w-3.5" />{role.user_count} users</p>
              <div className="flex items-center gap-3 text-sm">
                <Link href={`/workspace/roles/${role.id}/permissions`} className="text-indigo-400 hover:text-indigo-300">Permissions</Link>
                {!role.is_system && <>
                  <button onClick={() => setDialogRole(role)} className="text-neutral-400 hover:text-white flex items-center gap-1"><Pencil className="h-3.5 w-3.5" />Edit</button>
                  <button onClick={() => handleDelete(role)} disabled={deletingId === role.id} className="text-neutral-400 hover:text-red-400 flex items-center gap-1 ml-auto"><Trash2 className="h-3.5 w-3.5" /></button>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}
      {dialogRole !== undefined && <RoleFormDialog role={dialogRole} onClose={() => setDialogRole(undefined)} />}
      {reassignTarget && <ReassignRoleDialog role={reassignTarget} otherRoles={roles.filter((r) => r.id !== reassignTarget.id)} onClose={() => setReassignTarget(null)} />}
    </div>
  );
}