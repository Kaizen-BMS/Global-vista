"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

const inputClass = "w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function EditUserDialog({ user, roles, onClose }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name, email: user.email, phone: user.phone || "",
    roleId: user.role_id, status: user.status,
  });
  const [saving, setSaving] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("User updated.");
      onClose();
      router.refresh();
    } catch {
      toast.error("Failed to update user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setResettingPw(true);
    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", newPassword }),
      });
      if (!res.ok) throw new Error();
      toast.success("Password reset.");
      setNewPassword("");
    } catch {
      toast.error("Failed to reset password.");
    } finally {
      setResettingPw(false);
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
            <h2 className="text-white font-medium">Edit User</h2>
            <button onClick={onClose} className="text-neutral-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Full Name</label>
              <input required className={inputClass} value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Email</label>
              <input type="email" required className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Phone</label>
              <input className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            </div>
            {!user.is_super_admin && (
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Role</label>
                <select className={inputClass} value={form.roleId} onChange={(e) => setField("roleId", e.target.value)}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Status</label>
              <select className={inputClass} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-800">
            <p className="text-neutral-300 text-sm mb-2">Reset Password</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
              <button
                onClick={handleResetPassword}
                disabled={resettingPw}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm hover:text-white"
              >
                {resettingPw && <Loader2 className="h-4 w-4 animate-spin" />}
                Reset
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}