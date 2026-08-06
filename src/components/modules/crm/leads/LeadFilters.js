"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LEAD_STAGES, LEAD_TERMINAL_STAGES, LEAD_PRIORITIES } from "@/lib/constants/leadStages";
import { Search, Download } from "lucide-react";

export default function LeadFilters({ sources = [], services = [] }) {
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
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
        <input
          defaultValue={searchParams.get("search") || ""}
          onChange={(e) => setParam("search", e.target.value)}
          placeholder="Search leads..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <select
        defaultValue={searchParams.get("stage") || ""}
        onChange={(e) => setParam("stage", e.target.value)}
        className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm"
      >
        <option value="">All Stages</option>
        {[...LEAD_STAGES, ...LEAD_TERMINAL_STAGES].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("priority") || ""}
        onChange={(e) => setParam("priority", e.target.value)}
        className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm"
      >
        <option value="">All Priorities</option>
        {LEAD_PRIORITIES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("sourceId") || ""}
        onChange={(e) => setParam("sourceId", e.target.value)}
        className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm"
      >
        <option value="">All Sources</option>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("serviceId") || ""}
        onChange={(e) => setParam("serviceId", e.target.value)}
        className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm"
      >
        <option value="">All Services</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <a
        href="/api/leads/export"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-sm transition"
      >
        <Download className="h-4 w-4" />
        Export
      </a>
    </div>
  );
}