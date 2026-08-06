import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/crm/shared/SettingsTabs";
import SettingsForm from "@/components/crm/forms/SettingsForm";

export default async function NotificationSettingsPage() {
  const values = await getSettingsByGroup("notifications");
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
      <SettingsTabs />
      <SettingsForm
        group="notifications"
        initialValues={values}
        fields={[
          { key: "notify_on_new_lead", label: "Notify on New Lead (true/false)" },
          { key: "notify_on_lead_assigned", label: "Notify on Lead Assigned (true/false)" },
        ]}
      />
    </div>
  );
}