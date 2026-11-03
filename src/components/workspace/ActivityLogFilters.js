"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/** Same setParam-via-URLSearchParams pattern LeadFilters.js already uses
 * — just one dropdown, "All Employees" by default. */
export default function ActivityLogFilters({ employees }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4">
      <select
        value={searchParams.get("employee") || ""}
        onChange={(e) => setParam("employee", e.target.value)}
        className="px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer"
      >
        <option value="">All Employees</option>
        {employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    </div>
  );
}
