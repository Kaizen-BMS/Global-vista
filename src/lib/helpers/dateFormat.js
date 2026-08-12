const DEFAULT_TZ = "UTC";

/** Used at the settings-write boundary (platform + company) so a bad IANA
 * zone name — a stray copy-paste artifact, trailing whitespace, anything
 * `Intl.DateTimeFormat` won't accept — never reaches the database and
 * silently breaks every page that formats a date until someone notices. */
export function isValidTimeZone(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; }
  catch { return false; }
}

/** MySQL returns DATETIME values as naive local-clock strings once the pool session is
 * pinned to UTC (see src/lib/db.js `timezone: "Z"`) — so treating them as UTC here is safe. */
function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Explicit date-time components (not `dateStyle`/`timeStyle`) throughout, since
// those two shorthand options cannot be mixed with individual overrides like
// omitting `year` — every helper here needs to compose cleanly with callers'
// `opts`, so the granular form is the only one that works in every case.
const DATE_DEFAULTS = { year: "numeric", month: "short", day: "numeric" };
const TIME_DEFAULTS_12H = { hour: "2-digit", minute: "2-digit", hour12: true };
const TIME_DEFAULTS_24H = { hour: "2-digit", minute: "2-digit", hour12: false };

// ICU's Intl.DateTimeFormat deliberately doesn't expose common 3-letter
// abbreviations like IST (ambiguous between India/Israel/Ireland) — only
// "GMT+5:30"-style offsets. This curated map covers the zones this app's
// tenants actually use; anything outside it falls back to that GMT offset,
// which is unambiguous even if less familiar.
const ZONE_ABBREVIATIONS = {
  "Asia/Kolkata": "IST", "Asia/Calcutta": "IST",
  "Asia/Dubai": "GST", "Asia/Karachi": "PKT", "Asia/Dhaka": "BST",
  "Asia/Singapore": "SGT", "Asia/Hong_Kong": "HKT", "Asia/Shanghai": "CST",
  "Asia/Tokyo": "JST", "Asia/Seoul": "KST",
  "Europe/London": "GMT/BST", "Europe/Paris": "CET", "Europe/Berlin": "CET", "Europe/Moscow": "MSK",
  "America/New_York": "ET", "America/Chicago": "CT", "America/Denver": "MT", "America/Los_Angeles": "PT",
  "Australia/Sydney": "AEST", "UTC": "UTC",
};

function zoneAbbreviation(timeZone, date) {
  if (ZONE_ABBREVIATIONS[timeZone]) return ZONE_ABBREVIATIONS[timeZone];
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" }).formatToParts(date).find((p) => p.type === "timeZoneName")?.value || timeZone;
  } catch {
    return timeZone;
  }
}

function format(d, timeZone, opts) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(d);
  } catch (err) {
    console.error(`dateFormat: invalid timezone "${timeZone}", falling back to UTC`, err.message);
    return new Intl.DateTimeFormat("en-US", { timeZone: DEFAULT_TZ, ...opts }).format(d);
  }
}

/** `hour12`: pass `false` for a 24-hour clock (defaults to 12-hour, matching a company's
 * `system.time_format` setting when the caller threads it through). */
export function formatDateTime(value, timeZone = DEFAULT_TZ, opts = {}) {
  const d = toDate(value);
  if (!d) return "—";
  const { hour12, ...rest } = opts;
  const timeDefaults = hour12 === false ? TIME_DEFAULTS_24H : TIME_DEFAULTS_12H;
  return format(d, timeZone, { ...DATE_DEFAULTS, ...timeDefaults, ...rest });
}

export function formatDate(value, timeZone = DEFAULT_TZ, opts = {}) {
  const d = toDate(value);
  if (!d) return "—";
  return format(d, timeZone, { ...DATE_DEFAULTS, ...opts });
}

export function formatTime(value, timeZone = DEFAULT_TZ, opts = {}) {
  const d = toDate(value);
  if (!d) return "—";
  const { hour12, ...rest } = opts;
  const timeDefaults = hour12 === false ? TIME_DEFAULTS_24H : TIME_DEFAULTS_12H;
  return format(d, timeZone, { ...timeDefaults, ...rest });
}

/** formatDateTime plus a trailing zone abbreviation, e.g. "Aug 7, 2026, 1:48 PM IST". */
export function formatDateTimeWithZone(value, timeZone = DEFAULT_TZ, opts = {}) {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatDateTime(value, timeZone, opts)} ${zoneAbbreviation(timeZone, d)}`;
}

export { zoneAbbreviation };

/** Calendar-day key (as a UTC-midnight timestamp) for `date` in `timeZone` — lets two
 * instants be compared by "same calendar day in this timezone" regardless of the
 * browser's own local zone. */
export function dayKey(date, timeZone = DEFAULT_TZ) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  } catch (err) {
    console.error(`dateFormat: invalid timezone "${timeZone}", falling back to UTC`, err.message);
    parts = new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  }
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")));
}

/** "Today" / "Yesterday" / a formatted date, bucketed by calendar day in `timeZone`. */
export function dayLabel(value, timeZone = DEFAULT_TZ) {
  const d = toDate(value);
  if (!d) return "—";
  const diffDays = Math.round((dayKey(new Date(), timeZone) - dayKey(d, timeZone)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return diffDays > 0 && diffDays < 365 ? formatDate(d, timeZone, { year: undefined }) : formatDate(d, timeZone);
}

export function formatRelative(value) {
  const d = toDate(value);
  if (!d) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(-diffSec, "second");
  if (abs < 3600) return rtf.format(-Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(-Math.round(diffSec / 3600), "hour");
  if (abs < 2592000) return rtf.format(-Math.round(diffSec / 86400), "day");
  return rtf.format(-Math.round(diffSec / 2592000), "month");
}
