// Monday-start week (ISO-8601), used consistently by every "Week" range in
// this app — documented once here rather than left implicit, per the
// explicit "do not mix Sunday-start/Monday-start across components"
// requirement. If a future feature genuinely needs Sunday-start, it must
// say so explicitly rather than silently drifting from this.
const WEEK_STARTS_ON_MONDAY = true;

const QUARTER_MONTHS = { 1: [1, 3], 2: [4, 6], 3: [7, 9], 4: [10, 12] };
export const QUARTER_LABELS = { 1: "Jan – Mar", 2: "Apr – Jun", 3: "Jul – Sep", 4: "Oct – Dec" };
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
 * The UTC instant for (year, month, day, hour, minute, second) as it reads
 * on a wall clock in `timeZone` — the "double conversion" trick: guess the
 * instant by treating the wall time as UTC, ask the timezone what wall
 * time that guess actually produces, then correct by the difference.
 * One pass is exact outside the ~1hr DST-transition instant itself.
 */
export function zonedTimeToUtc(year, month, day, hour, minute, second, timeZone) {
  timeZone = safeZone(timeZone);
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  const h = get("hour") % 24; // Intl can report "24" for midnight in hour12:false edge cases
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), h, get("minute"), get("second"));
  return new Date(guess - (asIfUtc - guess));
}

function startOfDayInZone(year, month, day, timeZone) {
  return zonedTimeToUtc(year, month, day, 0, 0, 0, timeZone);
}

/** Today's (year, month, day) as observed on a wall clock in `timeZone` —
 * the calendar-date half of "what day is it right now, there." */
function currentDateInZone(timeZone) {
  timeZone = safeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** 0 = Sunday .. 6 = Saturday — day-of-week is a property of the calendar
 * date alone, so anchoring the already-zone-resolved (year, month, day) to
 * UTC noon (not midnight, to stay clear of any DST-adjacent edge case in
 * the anchor itself) and reading getUTCDay() back is exact. */
function weekdayOf(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/** Calendar-boundary ranges, all ending at "now" (not a rolling window):
 *   Today = start of today .. now
 *   Week  = start of this week (Monday) .. now
 *   Month = start of this month .. now
 * Every boundary is computed from the wall-clock date in `timeZone`, so a
 * user in Asia/Kolkata gets a different "today" than a server running in
 * UTC the instant local time crosses midnight — not up to 5.5 hours later. */
function calendarRangeInZone(kind, timeZone) {
  const { year, month, day } = currentDateInZone(timeZone);
  const now = new Date();
  if (kind === "today") return { start: startOfDayInZone(year, month, day, timeZone), end: now, label: "Today" };
  if (kind === "week") {
    const dow = weekdayOf(year, month, day);
    const daysSinceMonday = WEEK_STARTS_ON_MONDAY ? (dow + 6) % 7 : dow;
    // Subtract via a UTC calendar anchor (not ms arithmetic) so month/year
    // rollovers (e.g. today is 3 Aug, week started 29 Jul) are handled by
    // Date's own calendar math instead of being computed by hand.
    const anchor = new Date(Date.UTC(year, month - 1, day));
    anchor.setUTCDate(anchor.getUTCDate() - daysSinceMonday);
    return { start: startOfDayInZone(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, anchor.getUTCDate(), timeZone), end: now, label: "Week" };
  }
  // month
  return { start: startOfDayInZone(year, month, 1, timeZone), end: now, label: "Month" };
}

/**
 * Parses an HTML `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm",
 * no timezone of its own by spec) as wall-clock time in `timeZone`, and
 * returns the real UTC instant. This is the fix for follow-ups storing the
 * wrong time: the raw input value was previously written straight into a
 * DATETIME column with no conversion at all, so "17:00" typed by a user in
 * Asia/Kolkata was stored as literal "17:00" — which the rest of the app
 * (dateFormat.js's `toDate()`) correctly treats as a UTC instant on
 * display, silently shifting it forward by the zone offset (17:00 IST
 * became 22:30 IST on screen). Converting here, once, at the write
 * boundary, means every downstream reader keeps working unchanged.
 */
// Returns a real JS Date (a UTC instant) rather than a hand-formatted
// string on purpose: pass this straight to mysql2 as a query parameter for
// a DATETIME column and the driver serializes it correctly per the pool's
// `timezone: "Z"` setting (see src/lib/db.js) — no manual string formatting
// needed, and no risk of a non-ISO string ("YYYY-MM-DD HH:MM:SS") later
// being mis-parsed as local time by `new Date(...)` somewhere downstream
// (e.g. in an email template that re-parses the value it was handed).
export function parseDateTimeLocalInZone(value, timeZone) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value || "");
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return zonedTimeToUtc(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s || 0), timeZone);
}

function currentMonthYear(timeZone) {
  timeZone = safeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, month: "numeric", year: "numeric" }).formatToParts(new Date());
  return { month: Number(parts.find((p) => p.type === "month").value), year: Number(parts.find((p) => p.type === "year").value) };
}

/** `fyStartMonth` defaults to 1 (January) — a plain calendar year, which is
 * exactly the previous fixed behavior every existing caller (Platform
 * dashboard included) still gets unless it explicitly passes a company's
 * configured fiscal start month. */
export function currentQuarter(timeZone = "UTC", fyStartMonth = 1) {
  const { month, year } = currentMonthYear(timeZone);
  const monthsSinceStart = (month - fyStartMonth + 12) % 12;
  const quarter = Math.floor(monthsSinceStart / 3) + 1;
  const fyYear = month >= fyStartMonth ? year : year - 1;
  return { quarter, year: fyStartMonth === 1 ? year : fyYear };
}

/** Dynamically generated, centered on the current year — not a hardcoded list. */
export function quarterYearOptions(timeZone = "UTC", span = 2, fyStartMonth = 1) {
  const { year } = currentQuarter(timeZone, fyStartMonth);
  return Array.from({ length: span * 2 + 1 }, (_, i) => year - span + i);
}

/** financial-year label year -> {startYear,startMonth,endYear,endMonth} for quarter `q` (1-4). */
function quarterBoundsForFY(q, fyStartMonth, fyYear) {
  const startAbs = fyStartMonth + (q - 1) * 3;
  const startYear = fyYear + Math.floor((startAbs - 1) / 12);
  const startMonth = ((startAbs - 1) % 12) + 1;
  const endAbs = startAbs + 2;
  const endYear = fyYear + Math.floor((endAbs - 1) / 12);
  const endMonth = ((endAbs - 1) % 12) + 1;
  return { startYear, startMonth, endYear, endMonth };
}

function quarterLabelForFY(q, fyStartMonth) {
  if (fyStartMonth === 1) return QUARTER_LABELS[q];
  const { startMonth, endMonth } = quarterBoundsForFY(q, fyStartMonth, 2000); // year is irrelevant for the label
  return `${MONTH_ABBR[startMonth - 1]} – ${MONTH_ABBR[endMonth - 1]}`;
}
export { quarterLabelForFY };

/** Dynamically generated FY labels ("FY-2026") centered on the current financial year. */
export function financialYearOptions(timeZone = "UTC", fyStartMonth = 4, span = 2) {
  const { year } = currentQuarter(timeZone, fyStartMonth);
  return Array.from({ length: span * 2 + 1 }, (_, i) => year - span + i);
}

export function resolveRange(range, from, to, { timeZone = "UTC", quarter, qyear, years, fyStartMonth = 1 } = {}) {
  if (range === "custom" && from && to) return { start: new Date(from), end: new Date(to), label: "Custom" };

  if (range === "quarter") {
    const current = currentQuarter(timeZone, fyStartMonth);
    const q = [1, 2, 3, 4].includes(Number(quarter)) ? Number(quarter) : current.quarter;
    const y = Number(qyear) || current.year;
    const { startYear, startMonth, endYear, endMonth } = quarterBoundsForFY(q, fyStartMonth, y);
    const start = startOfDayInZone(startYear, startMonth, 1, timeZone);
    const nextMonth = endMonth === 12 ? 1 : endMonth + 1;
    const nextYear = endMonth === 12 ? endYear + 1 : endYear;
    const end = new Date(startOfDayInZone(nextYear, nextMonth, 1, timeZone).getTime() - 1);
    const label = fyStartMonth === 1 ? `Quarter · Q${q} · ${y}` : `Quarter · Q${q} · FY-${y}`;
    return { start, end, label, quarter: q, qyear: y };
  }

  // A single financial year, e.g. FY-2026 = 1 Apr 2026 -> 31 Mar 2027 for
  // fyStartMonth=4.
  if (range === "financial-year") {
    const current = currentQuarter(timeZone, fyStartMonth);
    const y = Number(qyear) || current.year;
    const start = startOfDayInZone(y, fyStartMonth, 1, timeZone);
    const nextFyStartMonth = fyStartMonth;
    const end = new Date(startOfDayInZone(y + 1, nextFyStartMonth, 1, timeZone).getTime() - 1);
    return { start, end, label: `FY-${y}`, qyear: y };
  }

  // Legacy rolling N-calendar-year window — kept only for the Platform
  // Console dashboard, which still passes range="year" and never sees
  // fyStartMonth. The workspace (tenant) dashboard no longer offers this
  // preset in its UI (Financial Year replaces it there) but the resolver
  // stays intact so it isn't a breaking change for the caller that still uses it.
  if (range === "year") {
    const n = YEAR_RANGE_OPTIONS.some((o) => o.value === Number(years)) ? Number(years) : 1;
    const { year: currentYear } = currentQuarter(timeZone, 1);
    const startYear = currentYear - n + 1;
    const start = startOfDayInZone(startYear, 1, 1, timeZone);
    const end = new Date(startOfDayInZone(currentYear + 1, 1, 1, timeZone).getTime() - 1);
    const label = n === 1 ? "Year · 1 Year" : `Year · ${n} Years`;
    return { start, end, label, years: n };
  }

  if (range === "today" || range === "week") return calendarRangeInZone(range, timeZone);
  return calendarRangeInZone("month", timeZone);
}
