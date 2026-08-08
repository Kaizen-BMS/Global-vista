"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Contact2, Users, CornerDownLeft } from "lucide-react";

const GROUP_ICONS = { Leads: Contact2, Users: Users };

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState(""); const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(false); const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef(null); const inputRef = useRef(null); const debounce = useRef(null);

  const flatResults = useMemo(() => (groups || []).flatMap((g) => g.results.map((r) => ({ ...r, group: g.group }))), [groups]);

  useEffect(() => { function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); } document.addEventListener("mousedown", onClick); return () => document.removeEventListener("mousedown", onClick); }, []);

  function handleChange(v) {
    setQuery(v); setOpen(true); setActiveIndex(0); clearTimeout(debounce.current);
    if (!v.trim()) { setGroups(null); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try { const res = await fetch(`/api/core/search?q=${encodeURIComponent(v)}`); setGroups((await res.json()).groups || []); }
      catch { setGroups([]); } finally { setLoading(false); }
    }, 300);
  }

  function go(href) {
    setOpen(false); setQuery(""); setGroups(null);
    router.push(href);
  }

  function handleKeyDown(e) {
    if (!flatResults.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => (i + 1) % flatResults.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => (i - 1 + flatResults.length) % flatResults.length); }
    else if (e.key === "Enter") { e.preventDefault(); const r = flatResults[activeIndex]; if (r) go(r.href); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  let runningIndex = -1;

  return (
    <div className="relative" ref={ref}>
      <div className="relative group">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-indigo-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search leads, users..."
          className="w-full pl-9 pr-9 py-2 rounded-lg bg-card border border-border text-foreground text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60"
        />
        {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />}
      </div>
      {open && query.trim() && groups && (
        <div className="absolute mt-2 w-full bg-card border border-border rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {flatResults.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No results for &ldquo;{query}&rdquo;.</p>}
          {groups.map((g) => {
            const Icon = GROUP_ICONS[g.group] || Search;
            return (
              <div key={g.group}>
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</p>
                {g.results.map((r) => {
                  runningIndex += 1;
                  const isActive = runningIndex === activeIndex;
                  return (
                    <button
                      key={`${g.group}-${r.id}`}
                      onMouseEnter={() => setActiveIndex(runningIndex)}
                      onClick={() => go(r.href)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer transition-colors ${isActive ? "bg-indigo-500/10" : "hover:bg-accent"}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-400" : "text-muted-foreground"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-foreground truncate">{r.title}</span>
                        <span className="block text-xs text-muted-foreground truncate">{r.subtitle}</span>
                      </span>
                      {isActive && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
