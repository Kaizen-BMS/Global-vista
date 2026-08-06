import "server-only";
const buckets = new Map();
export function rateLimit(key, { max = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.start > windowMs) { buckets.set(key, { start: now, count: 1 }); return { allowed: true }; }
  if (entry.count >= max) return { allowed: false };
  entry.count++;
  return { allowed: true };
}