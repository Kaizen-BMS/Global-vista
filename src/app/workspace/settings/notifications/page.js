import { getSession } from "@/lib/auth";
import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/shared/SettingsTabs";
import SettingsForm from "@/components/forms/SettingsForm";

export default async function NotificationSettingsPage() {
  const session = await getSession();
  const values = await getSettingsByGroup(session, "notifications");
  return (<div><h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1><SettingsTabs /><SettingsForm group="notifications" initialValues={values} fields={[{ key: "notify_on_new_lead", label: "Notify on New Lead" }]} /></div>);
}