import { listServices } from "@/lib/actions/leadMeta";
import SettingsTabs from "@/components/crm/shared/SettingsTabs";
import ManagedListEditor from "@/components/crm/forms/ManagedListEditor";

export default async function ServicesSettingsPage() {
  const services = await listServices();
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
      <SettingsTabs />
      <ManagedListEditor
        title="Services"
        apiBase="/api/settings/services"
        items={services}
      />
    </div>
  );
}