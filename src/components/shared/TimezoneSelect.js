"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { Search, Check, ChevronDown } from "lucide-react";

// Covers every major region even on the rare browser without
// Intl.supportedValuesOf (older Safari) — supportedValuesOf, when available,
// supersedes this with the full IANA database.
const FALLBACK_ZONES = [
  "UTC", "Asia/Kolkata", "Asia/Dubai", "Asia/Karachi", "Asia/Dhaka", "Asia/Singapore", "Asia/Hong_Kong",
  "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul", "Asia/Bangkok", "Asia/Jakarta", "Asia/Manila", "Asia/Kathmandu",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Moscow", "Europe/Istanbul",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto", "America/Sao_Paulo",
  "Australia/Sydney", "Australia/Melbourne", "Australia/Perth", "Pacific/Auckland", "Africa/Cairo", "Africa/Johannesburg",
  "Africa/Lagos", "Africa/Nairobi",
];

function allZones() {
  if (typeof Intl.supportedValuesOf === "function") {
    try { return Intl.supportedValuesOf("timeZone"); } catch { /* fall through */ }
  }
  return FALLBACK_ZONES;
}

function offsetLabel(zone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

/** Searchable IANA timezone picker — stores the zone identifier itself
 * (e.g. "Asia/Kolkata"), never an ambiguous abbreviation like "IST". */
export default function TimezoneSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  const zones = useMemo(() => allZones().sort(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? zones.filter((z) => z.toLowerCase().replace(/_/g, " ").includes(q)) : zones;
    return list.slice(0, 200);
  }, [zones, query]);

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
      >
        <span className="truncate">{value ? `${value.replace(/_/g, " ")} (${offsetLabel(value)})` : "Select a timezone"}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search timezones…"
              className="w-full bg-transparent text-sm text-foreground focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">No matching timezone.</p>}
            {filtered.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => { onChange(z); setOpen(false); setQuery(""); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition cursor-pointer"
              >
                <span className="truncate">{z.replace(/_/g, " ")}</span>
                <span className="flex items-center gap-2 shrink-0 text-muted-foreground text-xs">
                  {offsetLabel(z)}
                  {z === value && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
