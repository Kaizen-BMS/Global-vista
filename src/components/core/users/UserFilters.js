"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Plus, Upload } from "lucide-react";
import CreateUserDialog from "@/components/crm/dialogs/CreateUserDialog";
import ImportUsersWizard from "@/components/crm/users/ImportUsersWizard";

export default function UserFilters({ roles, branches, departments, designations, employeeTypes, managers, canManage, canImport }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
        <input
          defaultValue={searchParams.get("search") || ""}
          onChange={(e) => setParam("search", e.target.value)}
          placeholder="Search name, email, employee ID..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <select
        defaultValue={searchParams.get("roleId") || ""}
        onChange={(e) => setParam("roleId", e.target.value)}
        className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm"
      >
        <option value="">All Roles</option>
        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      <select
        defaultValue={searchParams.get("status") || ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="suspended">Suspended</option>
      </select>

      <div className="ml-auto flex items-center gap-2">
        {canImport && (
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-sm transition"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
        )}
        {canManage && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        )}
      </div>

      {createOpen && (
        <CreateUserDialog
          roles={roles}
          branches={branches}
          departments={departments}
          designations={designations}
          employeeTypes={employeeTypes}
          managers={managers}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {importOpen && <ImportUsersWizard onClose={() => setImportOpen(false)} />}
    </div>
  );
}