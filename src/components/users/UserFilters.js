"use client";
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Plus } from "lucide-react";
import CreateUserDialog from "@/components/dialogs/CreateUserDialog";

export default function UserFilters({ roles, canManage, isSuperAdmin }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  function setParam(key, value) { const p = new URLSearchParams(searchParams.toString()); value ? p.set(key, value) : p.delete(key); p.delete("page"); router.push(`${pathname}?${p.toString()}`); }
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input defaultValue={searchParams.get("search") || ""} onChange={(e) => setParam("search", e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm" />
      </div>
      <select defaultValue={searchParams.get("roleId") || ""} onChange={(e) => setParam("roleId", e.target.value)} className="px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">
        <option value="">All Roles</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      {canManage && <button onClick={() => setCreateOpen(true)} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium cursor-pointer"><Plus className="h-4 w-4" />Add Employee</button>}
      {createOpen && <CreateUserDialog roles={roles} isSuperAdmin={isSuperAdmin} onClose={() => setCreateOpen(false)} />}
    </div>
  );
}