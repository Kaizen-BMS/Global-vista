"use client";
import { useState, useRef, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";

export default function GlobalSearch() {
  const [query, setQuery] = useState(""); const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false); const [open, setOpen] = useState(false);
  const ref = useRef(null); const debounce = useRef(null);

  useEffect(() => { function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); } document.addEventListener("mousedown", onClick); return () => document.removeEventListener("mousedown", onClick); }, []);

  function handleChange(v) {
    setQuery(v); setOpen(true); clearTimeout(debounce.current);
    if (!v.trim()) { setResults(null); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try { const res = await fetch(`/api/core/search?q=${encodeURIComponent(v)}`); setResults((await res.json()).results || []); }
      catch { setResults([]); } finally { setLoading(false); }
    }, 300);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
        <input value={query} onChange={(e) => handleChange(e.target.value)} onFocus={() => setOpen(true)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm" />
        {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500 animate-spin" />}
      </div>
      {open && query.trim() && results && (
        <div className="absolute mt-2 w-full bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
          {results.length === 0 && <p className="text-neutral-500 text-sm text-center py-6">No results.</p>}
        </div>
      )}
    </div>
  );
}