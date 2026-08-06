import { getSession } from "@/lib/auth";
import { listServices } from "@/lib/actions/leadMeta";
import SettingsTabs from "@/components/shared/SettingsTabs";
import ManagedListEditor from "@/components/forms/ManagedListEditor";

export default async function ServicesPage() {
  const session = await getSession();
  return (<div><h1 className="text-xl font-semibold text-white mb-1">Settings</h1><SettingsTabs /><ManagedListEditor title="Services" apiBase="/api/core/organization/services" items={await listServices(session)} /></div>);
}