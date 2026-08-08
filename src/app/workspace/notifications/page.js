import { getSession } from "@/lib/auth";
import { getUserNotifications } from "@/lib/actions/notifications";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { formatDateTime } from "@/lib/helpers/dateFormat";

export default async function NotificationsPage() {
  const session = await getSession();
  const [notifications, systemSettings] = await Promise.all([
    getUserNotifications(session, { limit: 100 }),
    getSettingsByGroup(session, "system"),
  ]);
  const timezone = systemSettings.timezone || "UTC";
  const hour12 = systemSettings.time_format !== "24h";
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-6">Notifications</h1>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {notifications.map((n) => <div key={n.id} className="px-4 py-3"><p className="text-foreground text-sm">{n.title}</p><p className="text-muted-foreground text-xs">{formatDateTime(n.created_at, timezone, { hour12 })}</p></div>)}
      </div>
    </div>
  );
}