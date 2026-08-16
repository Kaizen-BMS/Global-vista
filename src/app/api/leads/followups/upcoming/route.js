import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { getUpcomingFollowupReminders } from "@/lib/modules/crm/actions/leadFollowups";
import { getUpcomingMeetingReminders } from "@/lib/modules/crm/actions/leadMeetings";

/**
 * Merges follow-up and meeting reminders into one feed for
 * FollowupReminderWatcher — same window/grace defaults for both, so a
 * single client-side poller and escalation timer covers both event kinds.
 * Meeting ids are namespaced ("meeting-<id>") so they can never collide
 * with a follow-up id in the watcher's per-item dedup map.
 */
export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return forbidden();
  if (!(await can(session, "leads.view"))) return ok({ followups: [] });

  const [followups, meetings] = await Promise.all([
    getUpcomingFollowupReminders(session),
    getUpcomingMeetingReminders(session),
  ]);

  const merged = [
    ...followups.map((f) => ({ id: f.id, kind: "followup", type: f.type, scheduled_at: f.scheduled_at, lead_id: f.lead_id, lead_name: f.lead_name })),
    ...meetings.map((m) => ({ id: `meeting-${m.id}`, kind: "meeting", type: m.title, scheduled_at: m.starts_at, lead_id: m.lead_id, lead_name: m.lead_name })),
  ];

  return ok({ followups: merged });
});
