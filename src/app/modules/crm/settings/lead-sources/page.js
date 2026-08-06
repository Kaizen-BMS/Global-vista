import { listLeadSources } from "@/lib/actions/leadMeta";
import SettingsTabs from "@/components/crm/shared/SettingsTabs";
import ManagedListEditor from "@/components/crm/forms/ManagedListEditor";

export default async function LeadSourcesSettingsPage() {
  const sources = await listLeadSources();
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
      <SettingsTabs />
      <ManagedListEditor
        title="Lead Sources"
        apiBase="/api/settings/lead-sources"
        items={sources}
      />
    </div>
  );
}