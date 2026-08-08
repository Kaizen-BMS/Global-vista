const RANGE_DAYS = { today: 1, week: 7, month: 30, quarter: 90, year: 365 };

export function resolveRange(range, from, to) {
  if (range === "custom" && from && to) return { start: new Date(from), end: new Date(to), label: "Custom" };
  const days = RANGE_DAYS[range] || RANGE_DAYS.month;
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end, label: range && RANGE_DAYS[range] ? range[0].toUpperCase() + range.slice(1) : "Month" };
}
