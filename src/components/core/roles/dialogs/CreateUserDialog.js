"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

const inputClass = "w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function CreateUserDialog({ roles, branches = [], departments = [], designations = [], employeeTypes = [], managers = [], onClose }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", roleId: "",
    branchId: "", departmentId: "", designationId: "", employeeTypeId: "",
    reportingManagerId: "", joiningDate: "", sendWelcome: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors || {});
        toast.error(data.error || "Failed to create user.");
        return;
      }
      toast.success(`${form.name} added${form.sendWelcome ? " — welcome email sent." : "."}`);
      onClose();
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
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
        <motion.form
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
          className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium">Add User</h2>
            <button type="button" onClick={onClose} className="text-neutral-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm text-neutral-300 mb-1">Full Name *</label>
              <input required className={inputClass} value={form.name} onChange={(e) => setField("name", e.target.value)} />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Email *</label>
              <input type="email" required className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Phone</label>
              <input className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Role *</label>
              <select required className={inputClass} value={form.roleId} onChange={(e) => setField("roleId", e.target.value)}>
                <option value="">Select role</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.roleId && <p className="text-red-400 text-xs mt-1">{errors.roleId}</p>}
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Joining Date</label>
              <input type="date" className={inputClass} value={form.joiningDate} onChange={(e) => setField("joiningDate", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Branch</label>
              <select className={inputClass} value={form.branchId} onChange={(e) => setField("branchId", e.target.value)}>
                <option value="">Select branch</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Department</label>
              <select className={inputClass} value={form.departmentId} onChange={(e) => setField("departmentId", e.target.value)}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Designation</label>
              <select className={inputClass} value={form.designationId} onChange={(e) => setField("designationId", e.target.value)}>
                <option value="">Select designation</option>
                {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Employee Type</label>
              <select className={inputClass} value={form.employeeTypeId} onChange={(e) => setField("employeeTypeId", e.target.value)}>
                <option value="">Select type</option>
                {employeeTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-neutral-300 mb-1">Reporting Manager</label>
              <select className={inputClass} value={form.reportingManagerId} onChange={(e) => setField("reportingManagerId", e.target.value)}>
                <option value="">None</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 mt-4 text-sm text-neutral-300">
            <input type="checkbox" checked={form.sendWelcome} onChange={(e) => setField("sendWelcome", e.target.checked)} />
            Send welcome email with temporary password
          </label>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create User
            </button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}