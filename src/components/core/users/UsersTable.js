"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, UserX, UserCheck, Pencil, Unlock, Trash2, RotateCcw, ArrowUp, ArrowDown, PauseCircle } from "lucide-react";
import EditUserDialog from "@/components/crm/dialogs/EditUserDialog";
import EmptyState from "@/components/crm/shared/EmptyState";
import { Users as UsersIcon } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

const SORTABLE = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
];

export default function UsersTable({ users, roles, canManage, canUnlock, isSuperAdmin, viewingDeleted = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [bulkRoleId, setBulkRoleId] = useState("");

  function toggleSelect(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    const selectable = users.filter((u) => !u.is_super_admin).map((u) => u.id);
    setSelected(selected.length === selectable.length ? [] : selectable);
  }

  function handleSort(col) {
    const params = new URLSearchParams(searchParams.toString());
    const currentSort = params.get("sort");
    const currentDir = params.get("dir") || "DESC";
    params.set("sort", col);
    params.set("dir", currentSort === col && currentDir === "ASC" ? "DESC" : "ASC");
    router.push(`${pathname}?${params.toString()}`);
  }

  async function setStatus(user, status) {
    setBusyId(user.id);
    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`User set to ${status}.`);
      router.refresh();
    } catch {
      toast.error("Failed to update user.");
    } finally {
      setBusyId(null);
      setOpenMenuId(null);
    }
  }

  async function unlockUser(user) {
    setBusyId(user.id);
    try {
      const res = await apiFetch(`/api/users/${user.id}/unlock`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Account unlocked.");
      router.refresh();
    } catch {
      toast.error("Failed to unlock account.");
    } finally {
      setBusyId(null);
      setOpenMenuId(null);
    }
  }

  async function deleteUserRow(user) {
    if (!confirm(`Delete ${user.name}? They can be restored later from the deleted users view.`)) return;
    setBusyId(user.id);
    try {
      const res = await apiFetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("User deleted.");
      router.refresh();
    } catch {
      toast.error("Failed to delete user.");
    } finally {
      setBusyId(null);
      setOpenMenuId(null);
    }
  }

  async function restoreUserRow(user) {
    setBusyId(user.id);
    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      if (!res.ok) throw new Error();
      toast.success("User restored.");
      router.refresh();
    } catch {
      toast.error("Failed to restore user.");
    } finally {
      setBusyId(null);
      setOpenMenuId(null);
    }
  }

  async function bulkStatus(status) {
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulkAction: "status", ids: selected, status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selected.length} users updated.`);
      setSelected([]);
      router.refresh();
    } catch {
      toast.error("Bulk update failed.");
    }
  }

  async function bulkRole() {
    if (!bulkRoleId) return;
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulkAction: "role", ids: selected, roleId: bulkRoleId }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Role updated for ${selected.length} users.`);
      setSelected([]);
      setBulkRoleId("");
      router.refresh();
    } catch {
      toast.error("Bulk role assignment failed.");
    }
  }

  if (users.length === 0) {
    return <EmptyState icon={UsersIcon} title={viewingDeleted ? "No deleted users" : "No users found"} description={viewingDeleted ? "" : "Try adjusting your filters or add a new user."} />;
  }

  const STATUS_STYLES = {
    active: "bg-green-500/10 text-green-400 border-green-500/30",
    inactive: "bg-neutral-700/20 text-neutral-400 border-neutral-600/30",
    suspended: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  };

  return (
    <div>
      {selected.length > 0 && canManage && !viewingDeleted && (
        <div className="flex flex-wrap items-center gap-3 mb-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-sm">
          <span className="text-indigo-300">{selected.length} selected</span>
          <button onClick={() => bulkStatus("active")} className="text-neutral-300 hover:text-white">Activate</button>
          <button onClick={() => bulkStatus("inactive")} className="text-neutral-300 hover:text-white">Deactivate</button>
          <button onClick={() => bulkStatus("suspended")} className="text-neutral-300 hover:text-white">Suspend</button>
          <select
            value={bulkRoleId}
            onChange={(e) => setBulkRoleId(e.target.value)}
            className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-white text-xs"
          >
            <option value="">Assign role...</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button onClick={bulkRole} disabled={!bulkRoleId} className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40">Apply</button>
        </div>
      )}

      <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              {canManage && !viewingDeleted && (
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={selected.length > 0 && selected.length === users.filter((u) => !u.is_super_admin).length} onChange={toggleAll} />
                </th>
              )}
              {SORTABLE.map(({ key, label }) => (
                <th key={key} className="px-4 py-3">
                  <button onClick={() => handleSort(key)} className="flex items-center gap-1 hover:text-white">
                    {label}
                    {searchParams.get("sort") === key && (searchParams.get("dir") === "ASC" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">
                <button onClick={() => handleSort("last_login_at")} className="flex items-center gap-1 hover:text-white">
                  Last Login
                  {searchParams.get("sort") === "last_login_at" && (searchParams.get("dir") === "ASC" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </button>
              </th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
              return (
                <tr key={u.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition">
                  {canManage && !viewingDeleted && (
                    <td className="px-4 py-3">
                      {!u.is_super_admin && (
                        <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link href={`/crm/users/${u.id}`} className="text-white hover:text-indigo-400 font-medium">
                      {u.name}
                    </Link>
                    {u.is_super_admin ? <span className="ml-2 text-[10px] text-indigo-400">SUPER ADMIN</span> : null}
                    {isLocked ? <span className="ml-2 text-[10px] text-red-400">LOCKED</span> : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">{u.email}</td>
                  <td className="px-4 py-3 text-neutral-300">{u.phone || "—"}</td>
                  <td className="px-4 py-3 text-neutral-300">{u.role_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-md border ${STATUS_STYLES[u.status] || STATUS_STYLES.inactive}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400 text-xs">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3 relative">
                    {viewingDeleted ? (
                      isSuperAdmin && (
                        <button
                          onClick={() => restoreUserRow(u)}
                          disabled={busyId === u.id}
                          className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </button>
                      )
                    ) : (
                      canManage && (
                        <>
                          <button onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)} className="text-neutral-500 hover:text-white">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === u.id && (
                            <div className="absolute right-4 top-10 z-20 w-52 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
                              <button
                                onClick={() => { setEditingUser(u); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit / Reset Password
                              </button>
                              {!u.is_super_admin && (
                                <>
                                  <button
                                    onClick={() => setStatus(u, u.status === "active" ? "inactive" : "active")}
                                    disabled={busyId === u.id}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                                  >
                                    {u.status === "active" ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                    {u.status === "active" ? "Deactivate" : "Activate"}
                                  </button>
                                  {u.status !== "suspended" && (
                                    <button
                                      onClick={() => setStatus(u, "suspended")}
                                      disabled={busyId === u.id}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-400 hover:bg-neutral-800"
                                    >
                                      <PauseCircle className="h-3.5 w-3.5" /> Suspend
                                    </button>
                                  )}
                                </>
                              )}
                              {isLocked && canUnlock && (
                                <button
                                  onClick={() => unlockUser(u)}
                                  disabled={busyId === u.id}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-neutral-800"
                                >
                                  <Unlock className="h-3.5 w-3.5" /> Unlock Account
                                </button>
                              )}
                              {isSuperAdmin && !u.is_super_admin && (
                                <button
                                  onClick={() => deleteUserRow(u)}
                                  disabled={busyId === u.id}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-neutral-800 border-t border-neutral-800"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete User
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <div key={u.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Link href={`/crm/users/${u.id}`} className="text-white font-medium">{u.name}</Link>
              <span className={`text-xs px-2 py-1 rounded-md border ${STATUS_STYLES[u.status] || STATUS_STYLES.inactive}`}>
                {u.status}
              </span>
            </div>
            <p className="text-neutral-400 text-xs mb-1">{u.email}</p>
            <p className="text-neutral-500 text-xs">{u.role_name}</p>
            {viewingDeleted ? (
              isSuperAdmin && (
                <button onClick={() => restoreUserRow(u)} className="mt-3 text-xs text-green-400 hover:text-green-300">
                  Restore
                </button>
              )
            ) : (
              canManage && (
                <button onClick={() => setEditingUser(u)} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">
                  Edit
                </button>
              )
            )}
          </div>
        ))}
      </div>

      {editingUser && (
        <EditUserDialog user={editingUser} roles={roles} onClose={() => setEditingUser(null)} />
      )}
    </div>
  );
}