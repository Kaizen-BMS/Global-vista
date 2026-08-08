import { listCountries } from "@/lib/actions/geography";
import SettingsTabs from "@/components/shared/SettingsTabs";
import GeographyEditor from "@/components/forms/GeographyEditor";

export default async function GeographyPage() {
  return (<div><h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1><SettingsTabs /><GeographyEditor countries={await listCountries()} /></div>);
}