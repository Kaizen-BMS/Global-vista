// Today/Week/Month keep their existing rolling-window meaning — this
// feature only adds real calendar semantics to Quarter and Year, it
// doesn't touch the three ranges that already worked.
const RANGE_DAYS = { today: 1, week: 7, month: 30 };

const QUARTER_MONTHS = { 1: [1, 3], 2: [4, 6], 3: [7, 9], 4: [10, 12] };
export const QUARTER_LABELS = { 1: "Jan – Mar", 2: "Apr – Jun", 3: "Jul – Sep", 4: "Oct – Dec" };
export const YEAR_RANGE_OPTIONS = [
  { value: 1, label: "1 Year" },
  { value: 3, label: "3 Years" },
  { value: 5, label: "5 Years" },
  { value: 10, label: "10 Years" },
];

// A stored timezone value can be corrupted (bad manual edit, copy-paste
// artifact, stale data) — dateFormat.js already guards every Intl call
// against that and falls back to UTC rather than crashing; this file's
// Intl calls need the identical guard, since an invalid IANA zone name
// makes `new Intl.DateTimeFormat` throw synchronously, not something a
// try/catch at the call site can paper over one call at a time.
const zoneValidityCache = new Map();
function safeZone(timeZone) {
  if (zoneValidityCache.has(timeZone)) return zoneValidityCache.get(timeZone) ? timeZone : "UTC";
  let valid = true;
  try { new Intl.DateTimeFormat("en-US", { timeZone }); }
  catch { valid = false; console.error(`dateRange: invalid timezone "${timeZone}", falling back to UTC`); }
  zoneValidityCache.set(timeZone, valid);
  return valid ? timeZone : "UTC";
}

/**
 * The UTC instant for midnight of (year, month, day) as it reads on a
 * wall clock in `timeZone` — the "double conversion" trick: guess the
 * instant by treating the wall time as UTC, ask the timezone what wall
 * time that guess actually produces, then correct by the difference.
 * One pass is exact outside the ~1hr DST-transition instant itself,
 * which never lands exactly on a quarter/year boundary in practice.
 */
function startOfDayInZone(year, month, day, timeZone) {
  timeZone = safeZone(timeZone);
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  const hour = get("hour") % 24; // Intl can report "24" for midnight in hour12:false edge cases
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return new Date(guess - (asIfUtc - guess));
}

export function currentQuarter(timeZone = "UTC") {
  timeZone = safeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, month: "numeric", year: "numeric" }).formatToParts(new Date());
  const month = Number(parts.find((p) => p.type === "month").value);
  const year = Number(parts.find((p) => p.type === "year").value);
  return { quarter: Math.floor((month - 1) / 3) + 1, year };
}

/** Dynamically generated, centered on the current year — not a hardcoded list. */
export function quarterYearOptions(timeZone = "UTC", span = 2) {
  const { year } = currentQuarter(timeZone);
  return Array.from({ length: span * 2 + 1 }, (_, i) => year - span + i);
}

export function resolveRange(range, from, to, { timeZone = "UTC", quarter, qyear, years } = {}) {
  if (range === "custom" && from && to) return { start: new Date(from), end: new Date(to), label: "Custom" };

  if (range === "quarter") {
    const current = currentQuarter(timeZone);
    const q = [1, 2, 3, 4].includes(Number(quarter)) ? Number(quarter) : current.quarter;
    const y = Number(qyear) || current.year;
    const [startMonth, endMonth] = QUARTER_MONTHS[q];
    const start = startOfDayInZone(y, startMonth, 1, timeZone);
    const nextMonth = endMonth === 12 ? 1 : endMonth + 1;
    const nextYear = endMonth === 12 ? y + 1 : y;
    const end = new Date(startOfDayInZone(nextYear, nextMonth, 1, timeZone).getTime() - 1);
    return { start, end, label: `Quarter · Q${q} · ${y}`, quarter: q, qyear: y };
  }

  if (range === "year") {
    const n = YEAR_RANGE_OPTIONS.some((o) => o.value === Number(years)) ? Number(years) : 1;
    const { year: currentYear } = currentQuarter(timeZone);
    const startYear = currentYear - n + 1;
    const start = startOfDayInZone(startYear, 1, 1, timeZone);
    const end = new Date(startOfDayInZone(currentYear + 1, 1, 1, timeZone).getTime() - 1);
    const label = n === 1 ? "Year · 1 Year" : `Year · ${n} Years`;
    return { start, end, label, years: n };
  }

  const days = RANGE_DAYS[range] || RANGE_DAYS.month;
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end, label: range && RANGE_DAYS[range] ? range[0].toUpperCase() + range.slice(1) : "Month" };
}
