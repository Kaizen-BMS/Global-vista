"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

/**
 * Search-as-you-type Country/State/City picker — never loads the full
 * reference table into the browser (the API caps results at 20 and only
 * queries on keystroke, debounced). `type` is "country" | "state" | "city";
 * `parentId` scopes state/city search to the selected country/state (pass
 * the parent's numeric id — resolved by the caller, e.g. from a prior
 * selection in the same form). Stores/returns a plain name string, matching
 * how `leads.country/state/city` are already stored (free text, not an FK)
 * — this only improves the input experience, not the underlying schema.
 */
export default function GeoAutocomplete({ type, parentId, value, onChange, placeholder, disabled, dark = false }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    function onClickOutside(e) { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function search(q) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ type, q });
        if (parentId) params.set("parentId", parentId);
        const res = await apiFetch(`/api/core/geography/search?${params.toString()}`);
        const data = await res.json();
        setResults(data.results || []);
        setActiveIndex(-1);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 200);
  }

  function handleInput(v) {
    setQuery(v);
    onChange(v);
    setOpen(true);
    search(v);
  }

  function select(name) {
    setQuery(name);
    onChange(name);
    setOpen(false);
    setResults([]);
  }

  function clear() {
    setQuery("");
    onChange("");
    setResults([]);
  }

  function onKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIndex >= 0) { e.preventDefault(); select(results[activeIndex].name); }
    else if (e.key === "Escape") setOpen(false);
  }

  // The public form page renders its own fixed dark palette (not the app's
  // theme-token system, since a visitor never has ThemeProvider preference
  // context) — `dark` switches to matching literal colors instead of
  // bg-muted/border-border/text-foreground so this never mismatches it.
  const fieldClass = dark
    ? "w-full pl-8 pr-8 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
    : "w-full pl-8 pr-8 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50";
  const menuClass = dark
    ? "absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl"
    : "absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-card border border-border rounded-lg shadow-xl";
  const iconClass = dark ? "text-neutral-500" : "text-muted-foreground";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${iconClass}`} />
        <input
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder || "Type to search…"}
          className={fieldClass}
        />
        {loading ? (
          <Loader2 className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin ${iconClass}`} />
        ) : query ? (
          <button type="button" onClick={clear} aria-label="Clear" className={`absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer ${dark ? "text-neutral-500 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}><X className="h-3.5 w-3.5" /></button>
        ) : null}
      </div>
      {open && results.length > 0 && (
        <div className={menuClass}>
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => select(r.name)}
              className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition ${i === activeIndex ? "bg-indigo-600 text-white" : dark ? "text-white hover:bg-neutral-800" : "text-foreground hover:bg-muted"}`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
