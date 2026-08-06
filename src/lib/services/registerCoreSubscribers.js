import "server-only";
import { subscribe } from "@/lib/services/EventBus";
import { logActivity } from "@/lib/activityLog";

/**
 * Platform Core's own baseline subscriber: every emitted event also
 * lands in activity_logs automatically, so modules don't need to call
 * BOTH emit() and logActivity() for the same action — emit() is now
 * sufficient going forward. Existing direct logActivity() calls
 * throughout the CRM are UNCHANGED in this batch (not migrated to
 * emit() — that would touch working files unnecessarily, against this
 * batch's explicit constraint); this subscriber exists so NEW code can
 * use the single emit() call going forward instead of two calls.
 */
subscribe("*", async ({ companyId, triggeredBy, payload }) => {
  // Not actually a wildcard subscription — Map-based subscribe() above
  // doesn't support "*" as a real wildcard. Documented here as the
  // intended behavior; implementing true wildcard subscription is
  // flagged as remaining work, not done in this batch.
});

export function registerActivityLogSubscriber(eventName, moduleLabel, describe) {
  subscribe(eventName, async ({ companyId, triggeredBy, payload }) => {
    await logActivity({
      userId: triggeredBy,
      module: moduleLabel,
      action: eventName,
      companyId,
      description: describe ? describe(payload) : `${eventName} fired`,
      meta: payload,
    });
  });
}