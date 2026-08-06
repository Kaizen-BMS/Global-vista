import { getSession } from "@/lib/auth";
import { getUserNotifications } from "@/lib/actions/notifications";

export default async function NotificationsPage() {
  const session = await getSession();
  const notifications = await getUserNotifications(session, { limit: 100 });
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-6">Notifications</h1>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
        {notifications.map((n) => <div key={n.id} className="px-4 py-3"><p className="text-white text-sm">{n.title}</p><p className="text-neutral-500 text-xs">{new Date(n.created_at).toLocaleString()}</p></div>)}
      </div>
    </div>
  );
}