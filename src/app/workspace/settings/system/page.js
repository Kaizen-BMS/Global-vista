import { getSession } from "@/lib/auth";
import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/shared/SettingsTabs";
import SettingsForm from "@/components/forms/SettingsForm";

export default async function SystemSettingsPage() {
  const session = await getSession();
  const values = await getSettingsByGroup(session, "system");
  return (<div><h1 className="text-xl font-semibold text-white mb-1">Settings</h1><SettingsTabs /><SettingsForm group="system" initialValues={values} fields={[{ key: "timezone", label: "Timezone" }, { key: "date_format", label: "Date Format" }]} /></div>);
}