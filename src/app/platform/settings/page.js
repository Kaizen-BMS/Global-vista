import { getPlatformSettingsByGroup } from "@/lib/platform/actions/settings";
import PlatformSettingsForm from "@/components/platform/PlatformSettingsForm";

export default async function PlatformSettingsPage() {
  const [values, brandingValues] = await Promise.all([
    getPlatformSettingsByGroup("general"),
    getPlatformSettingsByGroup("branding"),
  ]);
  return (
    <div className="space-y-8">
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
      <div>
        <p className="text-white font-medium mb-1">White-Label Branding</p>
        <p className="text-neutral-500 text-sm mb-4">Controls Global Vista's own footer credit inside tenant workspaces.</p>
        <PlatformSettingsForm
          group="branding"
          initialValues={{ powered_by_enabled: "true", ...brandingValues }}
          fields={[
            { key: "powered_by_enabled", label: "Show \"Powered by Global Vista\" in tenant sidebars", type: "select", options: ["true", "false"] },
          ]}
        />
      </div>
    </div>
  );
}
