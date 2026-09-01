/**
 * Maps every real `notifications.type` value already used across the app
 * (createNotification call sites) to one of the categories a Super Admin
 * can toggle on/off in Settings > Organizational Setting. A type not
 * listed here has no on/off switch — it always fires (fail-open, so a gap
 * in this map can never silently swallow a notification nobody meant to
 * mute).
 */
export const NOTIFICATION_CATEGORIES = {
  notify_leads: [
    "lead_created", "lead_assigned", "lead_released", "lead_status_changed",
    "lead_form_resubmission", "followup_created", "meeting_scheduled",
  ],
  notify_payments: ["payment_received", "payment_failed", "subscription_activated", "subscription_changed"],
  notify_tasks: ["task_assigned", "task_completed"],
  notify_documents: ["document_uploaded", "document_reminder"],
  notify_messages: ["message", "message_received", "whatsapp"],
  notify_support: [
    "complaint_created", "complaint_reply", "complaint_status_changed",
    "idea_created", "idea_reply", "idea_status_changed",
  ],
  notify_account: ["user_created", "role_updated", "company_updated", "company_provisioned"],
};

/** Same wording as each category's toggle on Settings > Organizational
 * Setting — kept here so the Notifications page's own filter never drifts
 * from what a Super Admin sees when muting/unmuting that same category. */
export const CATEGORY_LABELS = {
  notify_leads: "Leads & Follow-ups",
  notify_tasks: "Tasks",
  notify_documents: "Documents",
  notify_payments: "Payments & Billing",
  notify_messages: "Messages",
  notify_support: "Support & Feedback",
  notify_account: "Account & Team",
};

const TYPE_TO_SETTING_KEY = Object.fromEntries(
  Object.entries(NOTIFICATION_CATEGORIES).flatMap(([settingKey, types]) => types.map((t) => [t, settingKey]))
);

/** `settings` is the plain key/value object getSettingsByGroup(session, "notifications")
 * already returns — values are stored as the strings "true"/"false" (see
 * SettingsForm's toggle type), defaulting to enabled when unset. */
export function isNotificationTypeEnabled(type, settings) {
  const settingKey = TYPE_TO_SETTING_KEY[type];
  if (!settingKey) return true; // uncategorized types are never mutable, always fire
  return (settings?.[settingKey] ?? "true") !== "false";
}

/** Which category a given notification's `type` belongs to — powers the
 * Notifications page's own filter. Anything not in the map (uncategorized,
 * same "always visible" reasoning as isNotificationTypeEnabled above)
 * falls into "other" rather than being dropped from the list entirely. */
export function getNotificationCategory(type) {
  return TYPE_TO_SETTING_KEY[type] || "other";
}
