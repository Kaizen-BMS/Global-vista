import { getSession } from "@/lib/auth";
import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/shared/SettingsTabs";
import SettingsForm from "@/components/forms/SettingsForm";

export default async function SystemSettingsPage() {
  const session = await getSession();
  const values = await getSettingsByGroup(session, "system");
  return (<div><h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1><SettingsTabs /><SettingsForm group="system" initialValues={values} fields={[
    { key: "timezone", label: "Timezone", hint: "IANA name, e.g. Asia/Kolkata — applied to every date/time shown across the workspace." },
    { key: "time_format", label: "Time Format", type: "select", options: [{ value: "12h", label: "12-hour (1:48 PM)" }, { value: "24h", label: "24-hour (13:48)" }] },
    { key: "date_format", label: "Date Format" },
  ]} /></div>);
}