import "server-only";

// In-memory sliding-window limiter. Fine for a single-instance
// deployment (Hostinger Node app); if you scale to multiple instances
// later, swap the Map for a shared store (Redis) — the interface stays
// the same.
const buckets = new Map();

export function rateLimit(key, { max = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: windowMs - (now - entry.start) };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}