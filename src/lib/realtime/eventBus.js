import "server-only";
import { EventEmitter } from "events";

/**
 * In-process pub/sub for "something changed, go refetch" signals — the free
 * half of a Server-Sent Events real-time layer (see
 * /api/core/realtime/stream). No new service, no new cost: just Node's
 * built-in EventEmitter, scoped per company_id so an employee only ever
 * hears about changes inside their own company (or, for a Platform
 * Operator, the platform-wide channel).
 *
 * Known, honest limitation: this only reaches clients connected to THIS
 * Node.js process. If this app is ever run as more than one Node process/
 * worker behind a load balancer, a change made on one process won't wake a
 * client connected to another — some users would fall back to the existing
 * 20s badge poll instead of getting an instant update. For a single Node
 * process (the normal `next start` deployment this app currently runs),
 * every connected client is on the same process and this works completely.
 * If this project ever scales to multiple Node processes, this module is
 * the one place that would need to become Redis pub/sub (or similar)
 * instead — nothing else in the calling code would need to change.
 */
const bus = new EventEmitter();
bus.setMaxListeners(0); // unbounded — one listener per connected SSE client, not a leak

function channelFor(companyId) { return `company:${companyId}`; }

/** Called from logActivity (see activityLog.js) for every meaningful
 * mutation already logged across the app — the single, already-universal
 * hook point, so no individual feature needs its own wiring to participate. */
export function publishChange(companyId, payload) {
  if (!companyId) return;
  bus.emit(channelFor(companyId), payload);
}

/** Returns an unsubscribe function — always call it when the SSE
 * connection closes, or listeners accumulate for the lifetime of the
 * process. */
export function subscribeToCompany(companyId, listener) {
  const channel = channelFor(companyId);
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}
