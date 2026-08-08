import Link from "next/link";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

export default function RangeFilter({ active, from, to, basePath = "/platform" }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`${basePath}?range=${r.key}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              active === r.key ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>
      <form method="GET" action={basePath} className="flex items-center gap-1.5">
        <input type="hidden" name="range" value="custom" />
        <input type="date" name="from" defaultValue={from} required className="px-2 py-1.5 rounded-md bg-card border border-border text-foreground text-xs" />
        <span className="text-muted-foreground text-xs">to</span>
        <input type="date" name="to" defaultValue={to} required className="px-2 py-1.5 rounded-md bg-card border border-border text-foreground text-xs" />
        <button type="submit" className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${active === "custom" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted border border-border"}`}>Apply</button>
      </form>
    </div>
  );
}
