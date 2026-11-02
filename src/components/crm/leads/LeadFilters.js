"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { LEAD_STAGES, LEAD_TERMINAL_STAGES, LEAD_PRIORITIES } from "@/lib/modules/crm/constants/leadStages";
import { Search, Download, SlidersHorizontal, Bookmark, BookmarkPlus, X, Trash2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { getCrmTerms } from "@/lib/helpers/crmTerms";
import FloatingPanel from "@/components/shared/FloatingPanel";

const ASSIGNED_TABS = [{ key: "", label: "All Visible" }, { key: "me", label: "Assigned to Me" }, { key: "unassigned", label: "Unassigned" }];
const FILTER_KEYS = ["stage", "priority", "sourceId", "serviceId", "assignedTo", "country", "tag", "createdFrom", "createdTo", "followupFrom", "followupTo"];

/**
 * One compact row — Search, an "Assigned to" quick-pick, and a single
 * "Filters" button that opens every other filter (Stage/Priority/Source/
 * Service + the date/tag/country ones that used to be a separate
 * "Advanced" panel) in one floating window, instead of a long strip of
 * selects plus a separate stacked quick-tabs row. All the same URL params
 * as before — this only changes how they're presented.
 */
export default function LeadFilters({ sources = [], services = [], counsellors = [], tags = [], allowImportExport = true, stages = LEAD_STAGES, isChildCompany = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [savedFilters, setSavedFilters] = useState([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const savedBtnRef = useRef(null);
  const filtersBtnRef = useRef(null);
  const terms = getCrmTerms(isChildCompany);

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

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const k of FILTER_KEYS) params.delete(k);
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

  const activeFilterCount = FILTER_KEYS.filter((k) => searchParams.get(k)).length;
  const hasAnyFilter = activeFilterCount > 0 || !!searchParams.get("search");
  const assignedActive = searchParams.get("assignedTo") || "";

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            defaultValue={searchParams.get("search") || ""}
            onChange={(e) => setParam("search", e.target.value)}
            placeholder={`Search ${terms.pluralLower}...`}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border shrink-0">
          {ASSIGNED_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setParam("assignedTo", t.key)}
              className={`px-2.5 py-1.5 rounded-md text-xs transition cursor-pointer ${assignedActive === t.key ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <button
            ref={filtersBtnRef}
            type="button"
            data-tour-target="students-filters-btn"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition cursor-pointer ${activeFilterCount > 0 ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300" : "bg-card border-border text-foreground hover:text-foreground"}`}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          <FloatingPanel anchorRef={filtersBtnRef} open={filtersOpen} onClose={() => setFiltersOpen(false)} width={360} align="start" className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!isChildCompany && (
                <>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Stage</label>
                    <select defaultValue={searchParams.get("stage") || ""} onChange={(e) => setParam("stage", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
                      <option value="">All Stages</option>
                      {[...stages, ...LEAD_TERMINAL_STAGES].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Priority</label>
                    <select defaultValue={searchParams.get("priority") || ""} onChange={(e) => setParam("priority", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
                      <option value="">All Priorities</option>
                      {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Source</label>
                    <select defaultValue={searchParams.get("sourceId") || ""} onChange={(e) => setParam("sourceId", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
                      <option value="">All Sources</option>
                      {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Service</label>
                    <select defaultValue={searchParams.get("serviceId") || ""} onChange={(e) => setParam("serviceId", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
                      <option value="">All Services</option>
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Assigned To</label>
                <select defaultValue={searchParams.get("assignedTo") || ""} onChange={(e) => setParam("assignedTo", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
                  <option value="">Anyone</option>
                  <option value="me">Me</option>
                  <option value="unassigned">Unassigned</option>
                  {counsellors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Country</label>
                <input defaultValue={searchParams.get("country") || ""} onChange={(e) => setParam("country", e.target.value)} placeholder="e.g. Canada" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tag</label>
                <select defaultValue={searchParams.get("tag") || ""} onChange={(e) => setParam("tag", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
                  <option value="">Any tag</option>
                  {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Created From</label>
                <input type="date" defaultValue={searchParams.get("createdFrom") || ""} onChange={(e) => setParam("createdFrom", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Created To</label>
                <input type="date" defaultValue={searchParams.get("createdTo") || ""} onChange={(e) => setParam("createdTo", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Follow-up From</label>
                <input type="date" defaultValue={searchParams.get("followupFrom") || ""} onChange={(e) => setParam("followupFrom", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Follow-up To</label>
                <input type="date" defaultValue={searchParams.get("followupTo") || ""} onChange={(e) => setParam("followupTo", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
              </div>
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-border">
              <button type="button" onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground text-xs transition cursor-pointer">
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            </div>
          </FloatingPanel>
        </div>

        <div className="relative shrink-0">
          <button ref={savedBtnRef} type="button" onClick={() => setSavedOpen((o) => !o)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground hover:text-foreground text-sm transition cursor-pointer">
            <Bookmark className="h-4 w-4" /> Saved
          </button>
          <FloatingPanel anchorRef={savedBtnRef} open={savedOpen} onClose={() => setSavedOpen(false)} width={256} className="p-2">
            {savedFilters.length === 0 && <p className="text-muted-foreground text-xs text-center py-4">No saved filters yet.</p>}
            {savedFilters.map((f) => (
              <div key={f.slug} onClick={() => applyParams(f.params)} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/60 cursor-pointer text-sm text-foreground transition group">
                <span className="truncate">{f.name}</span>
                <button onClick={(e) => removeSavedFilter(e, f.slug)} aria-label={`Delete saved filter ${f.name}`} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <button onClick={saveCurrentFilter} disabled={!hasAnyFilter} className="w-full flex items-center gap-1.5 mt-1 px-2.5 py-2 rounded-lg text-sm text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition">
              <BookmarkPlus className="h-4 w-4" /> Save current filter
            </button>
          </FloatingPanel>
        </div>

        {!isChildCompany && allowImportExport && (
          <>
            <a href={`/api/leads/export?${searchParams.toString()}${searchParams.toString() ? "&" : ""}format=xlsx`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground hover:text-foreground text-sm transition cursor-pointer" title="Export current filtered view to Excel">
              <Download className="h-4 w-4" /> Excel
            </a>
            <a href={`/api/leads/export?${searchParams.toString()}${searchParams.toString() ? "&" : ""}format=csv`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground hover:text-foreground text-sm transition cursor-pointer" title="Export current filtered view to CSV">
              <Download className="h-4 w-4" /> CSV
            </a>
          </>
        )}
      </div>
    </div>
  );
}
