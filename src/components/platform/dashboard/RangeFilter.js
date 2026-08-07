import Link from "next/link";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

export default function RangeFilter({ active, from, to }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/platform?range=${r.key}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              active === r.key ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>
      <form method="GET" action="/platform" className="flex items-center gap-1.5">
        <input type="hidden" name="range" value="custom" />
        <input type="date" name="from" defaultValue={from} required className="px-2 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs" />
        <span className="text-neutral-600 text-xs">to</span>
        <input type="date" name="to" defaultValue={to} required className="px-2 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs" />
        <button type="submit" className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${active === "custom" ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"}`}>Apply</button>
      </form>
    </div>
  );
}
