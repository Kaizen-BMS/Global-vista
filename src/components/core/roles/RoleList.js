"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, ShieldCheck, Trash2, Copy, Pencil, Users } from "lucide-react";
import RoleFormDialog from "@/components/crm/dialogs/RoleFormDialog";
import ReassignRoleDialog from "@/components/crm/dialogs/ReassignRoleDialog";
import EmptyState from "@/components/crm/shared/EmptyState";
import { apiFetch } from "@/components/crm/shared/apiClient";

export default function RoleList({ roles }) {
  const router = useRouter();
  const [dialogRole, setDialogRole] = useState(undefined);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [cloningId, setCloningId] = useState(null);

  async function handleDelete(role) {
    if (role.is_system) return;

    if (role.user_count > 0) {
      setReassignTarget(role);
      return;
    }

    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    setDeletingId(role.id);
    try {
      const res = await apiFetch(`/api/roles/${role.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Role deleted.");
      router.refresh();
    } catch (err) {
      toast.error(err.message || "Failed to delete role.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClone(role) {
    setCloningId(role.id);
    try {
      const res = await apiFetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${role.name} (Copy)`,
          slug: `${role.slug}-copy-${Date.now().toString(36)}`,
          description: role.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Role cloned. Configure its permissions on the matrix page.");
      router.push(`/crm/roles/${data.id}/permissions`);
    } catch (err) {
      toast.error(err.message || "Failed to clone role.");
    } finally {
      setCloningId(null);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setDialogRole(null)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
        >
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </div>

      {roles.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No roles yet" description="Create your first role to get started." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-medium">{role.name}</p>
                  {role.is_system ? (
                    <span className="text-[10px] text-indigo-400 uppercase">System Role</span>
                  ) : (
                    <span className="text-[10px] text-neutral-500 uppercase">Custom</span>
                  )}
                </div>
                <ShieldCheck className="h-4 w-4 text-neutral-600" />
              </div>
              <p className="text-neutral-500 text-sm mb-3 min-h-[2.5rem]">
                {role.description || "No description provided."}
              </p>
              <p className="flex items-center gap-1.5 text-neutral-500 text-xs mb-4">
                <Users className="h-3.5 w-3.5" /> {role.user_count} assigned user{role.user_count !== 1 ? "s" : ""}
              </p>

              <div className="flex items-center gap-3 text-sm">
                <Link href={`/crm/roles/${role.id}/permissions`} className="text-indigo-400 hover:text-indigo-300">
                  Permissions
                </Link>
                {!role.is_system && (
                  <>
                    <button onClick={() => setDialogRole(role)} className="text-neutral-400 hover:text-white flex items-center gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => handleClone(role)} disabled={cloningId === role.id} className="text-neutral-400 hover:text-white flex items-center gap-1">
                      <Copy className="h-3.5 w-3.5" /> Clone
                    </button>
                    <button onClick={() => handleDelete(role)} disabled={deletingId === role.id} className="text-neutral-400 hover:text-red-400 flex items-center gap-1 ml-auto">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                {role.is_system && (
                  <button onClick={() => setDialogRole(role)} className="text-neutral-400 hover:text-white flex items-center gap-1 ml-auto">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {dialogRole !== undefined && <RoleFormDialog role={dialogRole} onClose={() => setDialogRole(undefined)} />}
      {reassignTarget && (
        <ReassignRoleDialog
          role={reassignTarget}
          otherRoles={roles.filter((r) => r.id !== reassignTarget.id)}
          onClose={() => setReassignTarget(null)}
        />
      )}
    </div>
  );
}