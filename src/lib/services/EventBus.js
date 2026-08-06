import "server-only";
import { pool } from "@/lib/db";

/**
 * In-process synchronous event dispatcher, per the architecture already
 * decided (docs/11_WORKFLOW_ENGINE.md from the prior planning phase):
 * no message-queue infrastructure at this scale, subscribers registered
 * at module-load time, each wrapped so one failing subscriber never
 * breaks the emitting action or the others.
 *
 * Business logic never calls sendEmail/createNotification/logActivity
 * directly for "reactive" side effects — it emits an event, and
 * whatever's subscribed (today: ActivityLog auto-subscriber; future:
 * NotificationService, automation rules, webhooks) reacts independently.
 */
const subscribers = new Map(); // eventName -> Array<handler>

export function subscribe(eventName, handler) {
  if (!subscribers.has(eventName)) subscribers.set(eventName, []);
  subscribers.get(eventName).push(handler);
}

export async function emit(eventName, { companyId, triggeredBy = null, payload = {} }) {
  const handlers = subscribers.get(eventName) || [];
  const results = [];

  for (const handler of handlers) {
    try {
      const result = await handler({ companyId, triggeredBy, payload });
      results.push({ handler: handler.name || "anonymous", status: "ok", result });
    } catch (err) {
      // A subscriber failing must never break the action that emitted
      // the event (e.g. lead creation must succeed even if a
      // notification subscriber throws) — logged, not re-thrown.
      console.error(`EventBus subscriber failed for "${eventName}":`, err.message);
      results.push({ handler: handler.name || "anonymous", status: "error", error: err.message });
    }
  }

  pool.query(
    `INSERT INTO platform_events (company_id, event_name, payload, triggered_by, subscriber_results) VALUES (?, ?, ?, ?, ?)`,
    [companyId, eventName, JSON.stringify(payload), triggeredBy, JSON.stringify(results)]
  ).catch((err) => console.error("Failed to persist platform event:", err.message));

  return results;
}

export function getRegisteredEvents() {
  return Array.from(subscribers.keys());
}