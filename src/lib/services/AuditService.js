import "server-only";
import { logActivity, getActivityLogs } from "@/lib/activityLog";

/**
 * Thin named wrapper over the existing, working activityLog.js — NOT a
 * reimplementation. Exists so future modules import from
 * lib/services/AuditService per "every future module must use these
 * services," while the actual logic stays exactly where it already
 * works, unmodified.
 */
export const AuditService = { log: logActivity, getLogs: getActivityLogs };