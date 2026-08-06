import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/crm/shared/SettingsTabs";
import SettingsForm from "@/components/crm/forms/SettingsForm";

export default async function SystemSettingsPage() {
  const values = await getSettingsByGroup("system");
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
      <SettingsTabs />
      <SettingsForm
        group="system"
        initialValues={values}
        fields={[
          { key: "timezone", label: "Timezone" },
          { key: "date_format", label: "Date Format" },
          { key: "session_timeout_minutes", label: "Session Timeout (minutes)" },
        ]}
      />
    </div>
  );
}