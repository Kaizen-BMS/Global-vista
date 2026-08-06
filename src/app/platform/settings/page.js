import { getPlatformSettingsByGroup } from "@/lib/platform/actions/settings";
import PlatformSettingsForm from "@/components/platform/PlatformSettingsForm";

export default async function PlatformSettingsPage() {
  const values = await getPlatformSettingsByGroup("general");
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Platform Settings</h1>
      <p className="text-neutral-500 text-sm mb-6">Global configuration for the platform console.</p>
      <PlatformSettingsForm
        group="general"
        initialValues={values}
        fields={[
          { key: "platform_name", label: "Platform Name" },
          { key: "default_timezone", label: "Default Timezone" },
          { key: "default_currency", label: "Default Currency" },
          { key: "maintenance_mode", label: "Maintenance Mode", type: "select", options: ["false", "true"] },
        ]}
      />
    </div>
  );
}
