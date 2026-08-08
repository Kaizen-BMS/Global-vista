"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function EditUserDialog({ user, roles, onClose }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || "", roleId: user.role_id, status: user.status });
  const [saving, setSaving] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      const res = await apiFetch(`/api/core/users/${user.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success("Updated."); onClose(); router.refresh();
    } catch { toast.error("Failed."); } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-foreground font-medium">Edit User</h2><button type="button" onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button></div>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mb-3 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full mb-3 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
        {!user.is_super_admin && <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="w-full mb-3 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
      </form>
    </div>
  );
}