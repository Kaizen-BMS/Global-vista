import { getSession } from "@/lib/auth";
import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/shared/SettingsTabs";
import SettingsForm from "@/components/forms/SettingsForm";

export default async function EmailSettingsPage() {
  const session = await getSession();
  const values = await getSettingsByGroup(session, "email");
  return (<div><h1 className="text-xl font-semibold text-white mb-1">Settings</h1><SettingsTabs /><SettingsForm group="email" initialValues={values} fields={[{ key: "smtp_host", label: "SMTP Host" }, { key: "smtp_port", label: "SMTP Port" }, { key: "smtp_from_name", label: "From Name" }]} /></div>);
}