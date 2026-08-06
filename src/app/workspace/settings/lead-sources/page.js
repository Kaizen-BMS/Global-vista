import { getSession } from "@/lib/auth";
import { listLeadSources } from "@/lib/actions/leadMeta";
import SettingsTabs from "@/components/shared/SettingsTabs";
import ManagedListEditor from "@/components/forms/ManagedListEditor";

export default async function LeadSourcesPage() {
  const session = await getSession();
  return (<div><h1 className="text-xl font-semibold text-white mb-1">Settings</h1><SettingsTabs /><ManagedListEditor title="Lead Sources" apiBase="/api/core/organization/lead-sources" items={await listLeadSources(session)} /></div>);
}