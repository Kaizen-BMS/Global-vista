"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

export default function ReassignRoleDialog({ role, otherRoles, onClose }) {
  const router = useRouter();
  const [targetRoleId, setTargetRoleId] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (!targetRoleId) {
      toast.error("Select a role to reassign users to.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch(`/api/roles/${role.id}?reassignToRoleId=${targetRoleId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Role deleted, ${role.user_count} user(s) reassigned.`);
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err.message || "Failed to reassign and delete role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" /> Reassign Before Deleting
            </h2>
            <button onClick={onClose} className="text-neutral-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-neutral-400 text-sm mb-4">
            <strong className="text-white">{role.name}</strong> has {role.user_count} assigned user(s). Choose a role to move them to before this role can be deleted.
          </p>

          <select
            value={targetRoleId}
            onChange={(e) => setTargetRoleId(e.target.value)}
            className="w-full mb-6 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm"
          >
            <option value="">Select target role</option>
            {otherRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-sm">Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Reassign & Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}