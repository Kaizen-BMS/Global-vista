import { listCountries } from "@/lib/actions/geography";
import SettingsTabs from "@/components/crm/shared/SettingsTabs";
import GeographyEditor from "@/components/crm/forms/GeographyEditor";

export default async function GeographyPage() {
  const countries = await listCountries();
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
      <SettingsTabs />
      <GeographyEditor countries={countries} />
    </div>
  );
}