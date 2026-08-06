"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { LEAD_STAGES, LEAD_TERMINAL_STAGES, LEAD_PRIORITIES } from "@/lib/modules/crm/constants/leadStages";
import { Search, Download, SlidersHorizontal, Bookmark, BookmarkPlus, X, Trash2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const ADVANCED_KEYS = ["assignedTo", "country", "tag", "createdFrom", "createdTo", "followupFrom", "followupTo"];

export default function LeadFilters({ sources = [], services = [], counsellors = [], tags = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [advancedOpen, setAdvancedOpen] = useState(() => ADVANCED_KEYS.some((k) => searchParams.get(k)));
  const [savedFilters, setSavedFilters] = useState([]);
  const [savedOpen, setSavedOpen] = useState(false);

  const loadSavedFilters = useCallback(() => {
    apiFetch("/api/leads/saved-filters").then((r) => r.json()).then((d) => setSavedFilters(d.filters || [])).catch(() => {});
  }, []);
  useEffect(() => { loadSavedFilters(); }, [loadSavedFilters]);

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyParams(paramObj) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(paramObj)) { if (v && k !== "__name") params.set(k, v); }
    router.push(`${pathname}?${params.toString()}`);
    setSavedOpen(false);
  }

  function clearAdvanced() {
    const params = new URLSearchParams(searchParams.toString());
    for (const k of ADVANCED_KEYS) params.delete(k);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  async function saveCurrentFilter() {
    const name = window.prompt("Name this filter:");
    if (!name || !name.trim()) return;
    const paramObj = Object.fromEntries(searchParams.entries());
    const res = await apiFetch("/api/leads/saved-filters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, params: paramObj }) });
    if (res.ok) { toast.success("Filter saved."); loadSavedFilters(); } else { toast.error("Failed to save filter."); }
  }

  async function removeSavedFilter(e, slug) {
    e.stopPropagation();
    const res = await apiFetch(`/api/leads/saved-filters/${slug}`, { method: "DELETE" });
    if (res.ok) { toast.success("Filter deleted."); loadSavedFilters(); } else { toast.error("Failed to delete filter."); }
  }

  const activeAdvancedCount = ADVANCED_KEYS.filter((k) => searchParams.get(k)).length;
  const hasAnyFilter = activeAdvancedCount > 0 || searchParams.get("search") || searchParams.get("stage") || searchParams.get("priority") || searchParams.get("sourceId") || searchParams.get("serviceId");

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            defaultValue={searchParams.get("search") || ""}
            onChange={(e) => setParam("search", e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select defaultValue={searchParams.get("stage") || ""} onChange={(e) => setParam("stage", e.target.value)} className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm cursor-pointer">
          <option value="">All Stages</option>
          {[...LEAD_STAGES, ...LEAD_TERMINAL_STAGES].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select defaultValue={searchParams.get("priority") || ""} onChange={(e) => setParam("priority", e.target.value)} className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm cursor-pointer">
          <option value="">All Priorities</option>
          {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select defaultValue={searchParams.get("sourceId") || ""} onChange={(e) => setParam("sourceId", e.target.value)} className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm cursor-pointer">
          <option value="">All Sources</option>
          {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select defaultValue={searchParams.get("serviceId") || ""} onChange={(e) => setParam("serviceId", e.target.value)} className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm cursor-pointer">
          <option value="">All Services</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition cursor-pointer ${advancedOpen || activeAdvancedCount > 0 ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300" : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"}`}
        >
          <SlidersHorizontal className="h-4 w-4" /> Advanced {activeAdvancedCount > 0 && `(${activeAdvancedCount})`}
        </button>

        <div className="relative">
          <button type="button" onClick={() => setSavedOpen((o) => !o)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-sm transition cursor-pointer">
            <Bookmark className="h-4 w-4" /> Saved
          </button>
          {savedOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-40 p-2 animate-in fade-in slide-in-from-top-1 duration-150">
              {savedFilters.length === 0 && <p className="text-neutral-500 text-xs text-center py-4">No saved filters yet.</p>}
              {savedFilters.map((f) => (
                <div key={f.slug} onClick={() => applyParams(f.params)} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-neutral-800/60 cursor-pointer text-sm text-neutral-200 transition group">
                  <span className="truncate">{f.name}</span>
                  <button onClick={(e) => removeSavedFilter(e, f.slug)} className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button onClick={saveCurrentFilter} disabled={!hasAnyFilter} className="w-full flex items-center gap-1.5 mt-1 px-2.5 py-2 rounded-lg text-sm text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition">
                <BookmarkPlus className="h-4 w-4" /> Save current filter
              </button>
            </div>
          )}
        </div>

        <a href={`/api/leads/export?${searchParams.toString()}${searchParams.toString() ? "&" : ""}format=xlsx`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-sm transition cursor-pointer" title="Export current filtered view to Excel">
          <Download className="h-4 w-4" /> Excel
        </a>
        <a href={`/api/leads/export?${searchParams.toString()}${searchParams.toString() ? "&" : ""}format=csv`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-sm transition cursor-pointer" title="Export current filtered view to CSV">
          <Download className="h-4 w-4" /> CSV
        </a>
      </div>

      {advancedOpen && (
        <div className="mt-2 p-4 bg-neutral-900 border border-neutral-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Assigned To</label>
            <select defaultValue={searchParams.get("assignedTo") || ""} onChange={(e) => setParam("assignedTo", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm cursor-pointer">
              <option value="">Anyone</option>
              {counsellors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Country</label>
            <input defaultValue={searchParams.get("country") || ""} onChange={(e) => setParam("country", e.target.value)} placeholder="e.g. Canada" className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Tag</label>
            <select defaultValue={searchParams.get("tag") || ""} onChange={(e) => setParam("tag", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm cursor-pointer">
              <option value="">Any tag</option>
              {tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div />
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Created From</label>
            <input type="date" defaultValue={searchParams.get("createdFrom") || ""} onChange={(e) => setParam("createdFrom", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Created To</label>
            <input type="date" defaultValue={searchParams.get("createdTo") || ""} onChange={(e) => setParam("createdTo", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Follow-up From</label>
            <input type="date" defaultValue={searchParams.get("followupFrom") || ""} onChange={(e) => setParam("followupFrom", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Follow-up To</label>
            <input type="date" defaultValue={searchParams.get("followupTo") || ""} onChange={(e) => setParam("followupTo", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
          <div className="col-span-full flex justify-end">
            <button type="button" onClick={clearAdvanced} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-500 hover:text-white text-xs transition cursor-pointer">
              <X className="h-3.5 w-3.5" /> Clear advanced filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
