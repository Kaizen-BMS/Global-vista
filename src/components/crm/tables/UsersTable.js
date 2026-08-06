"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UsersTable({ users, roles }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  async function toggleStatus(user) {
    setBusyId(user.id);
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`User ${newStatus === "active" ? "activated" : "deactivated"}.`);
      router.refresh();
    } catch {
      toast.error("Failed to update user.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-800">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last Login</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-neutral-800/60">
              <td className="px-4 py-3 text-white">
                {u.name} {u.is_super_admin ? <span className="text-xs text-indigo-400 ml-1">(Super Admin)</span> : null}
              </td>
              <td className="px-4 py-3 text-neutral-300">{u.email}</td>
              <td className="px-4 py-3 text-neutral-300">{u.role_name}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-md border ${
                  u.status === "active"
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : "bg-neutral-700/20 text-neutral-400 border-neutral-600/30"
                }`}>
                  {u.status}
                </span>
              </td>
              <td className="px-4 py-3 text-neutral-400 text-xs">
                {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
              </td>
              <td className="px-4 py-3 text-right">
                {!u.is_super_admin && (
                  <button
                    disabled={busyId === u.id}
                    onClick={() => toggleStatus(u)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {u.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}