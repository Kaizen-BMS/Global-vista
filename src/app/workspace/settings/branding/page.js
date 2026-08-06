import { getSession } from "@/lib/auth";
import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/shared/SettingsTabs";
import SettingsForm from "@/components/forms/SettingsForm";

export default async function BrandingPage() {
  const session = await getSession();
  const values = await getSettingsByGroup(session, "branding");
  return (<div><h1 className="text-xl font-semibold text-white mb-1">Settings</h1><SettingsTabs /><SettingsForm group="branding" initialValues={values} fields={[{ key: "site_name", label: "Site Name" }, { key: "logo_url", label: "Logo URL" }, { key: "primary_color", label: "Primary Color" }]} /></div>);
}