"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2, Star } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

function AssignedRolesEditor({ userId, allRoles, isSuperAdmin }) {
  const [roles, setRoles] = useState(null);
  const [busy, setBusy] = useState(false);
  const [addRoleId, setAddRoleId] = useState("");

  const load = useCallback(() => {
    apiFetch(`/api/core/users/${userId}/roles`).then((r) => r.json()).then((d) => setRoles(d.roles || [])).catch(() => setRoles([]));
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  async function addRole() {
    if (!addRoleId) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/core/users/${userId}/roles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleId: Number(addRoleId) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add role.");
      toast.success("Role added.");
      setAddRoleId(""); load();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function removeRole(roleId) {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/core/users/${userId}/roles/${roleId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to remove role.");
      toast.success("Role removed.");
      load();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function makeDefault(roleId) {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/core/users/${userId}/roles/${roleId}`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to set default role.");
      toast.success("Default role updated.");
      load();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  if (!isSuperAdmin) return null;
  if (roles === null) return <div className="mb-3 flex items-center gap-2 text-muted-foreground text-xs"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading roles…</div>;

  const assignedIds = new Set(roles.map((r) => r.role_id));
  const addable = allRoles.filter((r) => !assignedIds.has(r.id));

  return (
    <div className="mb-4">
      <label className="block text-xs text-muted-foreground mb-1.5">Assigned Roles</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {roles.map((r) => (
          <span key={r.role_id} className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs bg-muted border border-border text-foreground">
            <button type="button" onClick={() => makeDefault(r.role_id)} disabled={busy} title={r.is_default ? "Default role" : "Set as default"} aria-label={r.is_default ? "Default role" : `Set ${r.name} as default`} className="cursor-pointer disabled:opacity-50">
              <Star className={`h-3 w-3 ${r.is_default ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            </button>
            {r.name}
            {roles.length > 1 && (
              <button type="button" onClick={() => removeRole(r.role_id)} disabled={busy} aria-label={`Remove ${r.name} role`} className="text-muted-foreground hover:text-red-400 cursor-pointer disabled:opacity-50">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {addable.length > 0 && (
        <div className="flex items-center gap-2">
          <select value={addRoleId} onChange={(e) => setAddRoleId(e.target.value)} className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs cursor-pointer">
            <option value="">+ Add role…</option>
            {addable.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button type="button" onClick={addRole} disabled={!addRoleId || busy} className="px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-foreground text-xs cursor-pointer disabled:opacity-50">Add</button>
        </div>
      )}
      <p className="text-muted-foreground/70 text-[10px] mt-1.5">Click the star to set a role as default — that's the role the user is signed in with until they switch.</p>
    </div>
  );
}

export default function EditUserDialog({ user, roles, isSuperAdmin, onClose }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || "", roleId: user.role_id, status: user.status });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
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
      <ModalFocusTrap>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit User" className="w-full max-w-md bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-foreground font-medium">Edit User</h2><button type="button" onClick={onClose} aria-label="Close"><X className="h-4 w-4 text-muted-foreground" /></button></div>
        <label htmlFor="edit-user-name" className="sr-only">Name</label>
        <input id="edit-user-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mb-3 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
        <label htmlFor="edit-user-email" className="sr-only">Email</label>
        <input id="edit-user-email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full mb-3 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
        {!user.is_super_admin && !isSuperAdmin && <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="w-full mb-3 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}
        {!user.is_super_admin && isSuperAdmin && <AssignedRolesEditor userId={user.id} allRoles={roles} isSuperAdmin={isSuperAdmin} />}
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
      </form>
      </ModalFocusTrap>
    </div>
  );
}
