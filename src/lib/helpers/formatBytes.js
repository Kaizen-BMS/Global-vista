export function formatBytes(bytes) {
  // mysql2 returns SUM()/COALESCE() aggregates as numeric STRINGS (e.g. "0"),
  // not JS numbers — a plain `!bytes` check doesn't catch a truthy-but-zero
  // string like "0", which fell through into Math.log("0") = -Infinity and
  // rendered as "NaN undefined" everywhere storage usage was actually zero.
  const n = Number(bytes);
  if (!n || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
