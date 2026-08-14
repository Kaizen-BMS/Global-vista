"use client";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/helpers/dateFormat";
import { QUARTER_LABELS, YEAR_RANGE_OPTIONS, currentQuarter, quarterYearOptions, quarterLabelForFY, financialYearOptions } from "@/lib/helpers/dateRange";

const BASE_RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
];
const FY_RANGE = { key: "financial-year", label: "Financial Year" };
const YEAR_RANGE = { key: "year", label: "Year" };

export default function RangeFilter({
  active, from, to, quarter, qyear, years,
  rangeStart, rangeEnd, timezone = "UTC", basePath = "/platform",
  fyStartMonth, // only passed where "Financial Year" is meaningful (a single company) — omitted, Quarter stays a plain calendar quarter (unchanged behavior for every other caller of this shared component, e.g. the Platform dashboard).
}) {
  const router = useRouter();
  const fiscalMode = Number.isInteger(fyStartMonth);
  const fyMonth = fiscalMode ? fyStartMonth : 1;
  const current = currentQuarter(timezone, fyMonth);
  const yearOptions = quarterYearOptions(timezone, 2, fyMonth);
  // Fiscal mode (the workspace/tenant dashboard) replaces the generic
  // rolling "Year" preset with "Financial Year" entirely — Platform Console
  // (never passes fyStartMonth) keeps the old Year picker unchanged.
  const RANGES = fiscalMode ? [...BASE_RANGES, FY_RANGE] : [...BASE_RANGES, YEAR_RANGE];

  function go(params) {
    const usp = new URLSearchParams(params);
    router.push(`${basePath}?${usp.toString()}`);
  }

  function selectPreset(key) {
    if (key === "quarter") go({ range: "quarter", quarter: String(quarter || current.quarter), qyear: String(qyear || current.year) });
    else if (key === "financial-year") go({ range: "financial-year", qyear: String(qyear || current.year) });
    else if (key === "year") go({ range: "year", years: String(years || 1) });
    else go({ range: key });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => selectPreset(r.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                active === r.key ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {active === "quarter" && (
          <div className="flex items-center gap-1.5">
            <select
              value={quarter || current.quarter}
              onChange={(e) => go({ range: "quarter", quarter: e.target.value, qyear: String(qyear || current.year) })}
              title={fiscalMode ? quarterLabelForFY(quarter || current.quarter, fyMonth) : QUARTER_LABELS[quarter || current.quarter]}
              className="px-2.5 py-1.5 rounded-md bg-card border border-border text-foreground text-xs cursor-pointer"
            >
              {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q} ({fiscalMode ? quarterLabelForFY(q, fyMonth) : QUARTER_LABELS[q]})</option>)}
            </select>
            <select
              value={qyear || current.year}
              onChange={(e) => go({ range: "quarter", quarter: String(quarter || current.quarter), qyear: e.target.value })}
              className="px-2.5 py-1.5 rounded-md bg-card border border-border text-foreground text-xs cursor-pointer"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{fiscalMode ? `FY-${y}` : y}</option>)}
            </select>
          </div>
        )}

        {active === "financial-year" && (
          <select
            value={qyear || current.year}
            onChange={(e) => go({ range: "financial-year", qyear: e.target.value })}
            className="px-2.5 py-1.5 rounded-md bg-card border border-border text-foreground text-xs cursor-pointer"
          >
            {financialYearOptions(timezone, fyMonth).map((y) => <option key={y} value={y}>FY-{y}</option>)}
          </select>
        )}

        {active === "year" && (
          <select
            value={years || 1}
            onChange={(e) => go({ range: "year", years: e.target.value })}
            className="px-2.5 py-1.5 rounded-md bg-card border border-border text-foreground text-xs cursor-pointer"
          >
            {YEAR_RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        <form method="GET" action={basePath} className="flex items-center gap-1.5">
          <input type="hidden" name="range" value="custom" />
          <input type="date" name="from" defaultValue={from} required className="px-2 py-1.5 rounded-md bg-card border border-border text-foreground text-xs" />
          <span className="text-muted-foreground text-xs">to</span>
          <input type="date" name="to" defaultValue={to} required className="px-2 py-1.5 rounded-md bg-card border border-border text-foreground text-xs" />
          <button type="submit" className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${active === "custom" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted border border-border"}`}>Apply</button>
        </form>
      </div>

      {rangeStart && rangeEnd && (
        <p className="text-muted-foreground text-xs">{formatDate(rangeStart, timezone)} – {formatDate(rangeEnd, timezone)}</p>
      )}
    </div>
  );
}
