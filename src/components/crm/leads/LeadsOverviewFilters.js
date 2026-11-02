"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";

/** Read-only reporting filters for the GVE-only combined leads view — just
 * a search box and a school picker, same setParam-via-URLSearchParams
 * pattern LeadFilters.js already uses (no debounce there either). */
export default function LeadsOverviewFilters({ schools }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          defaultValue={searchParams.get("q") || ""}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Search name, phone, email…"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm"
        />
      </div>
      <select
        value={searchParams.get("school") || ""}
        onChange={(e) => setParam("school", e.target.value)}
        className="px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer"
      >
        <option value="">All Schools</option>
        {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        <option value="independent">Independent</option>
      </select>
    </div>
  );
}
