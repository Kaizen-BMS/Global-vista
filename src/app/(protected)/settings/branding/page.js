import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/crm/shared/SettingsTabs";
import SettingsForm from "@/components/crm/forms/SettingsForm";

export default async function BrandingSettingsPage() {
  const values = await getSettingsByGroup("branding");
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
      <p className="text-neutral-500 text-sm mb-6">Super Admin only</p>
      <SettingsTabs />
      <SettingsForm
        group="branding"
        initialValues={values}
        fields={[
          { key: "site_name", label: "Site Name" },
          { key: "logo_url", label: "Logo URL" },
          { key: "primary_color", label: "Primary Color" },
        ]}
      />
    </div>
  );
}