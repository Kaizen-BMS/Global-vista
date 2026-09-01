import { getSession } from "@/lib/auth";
import { getUserNotifications, getUserNotificationPreferences } from "@/lib/actions/notifications";
import NotificationsClient from "@/components/notifications/NotificationsClient";

export default async function NotificationsPage() {
  const session = await getSession();
  const [notifications, preferences] = await Promise.all([
    getUserNotifications(session, { limit: 200 }),
    getUserNotificationPreferences(session),
  ]);
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-6">Notifications</h1>
      <NotificationsClient initialNotifications={notifications} initialPreferences={preferences} />
    </div>
  );
}
