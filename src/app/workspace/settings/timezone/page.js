import { getSession } from "@/lib/auth";
import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/shared/SettingsTabs";
import SettingsForm from "@/components/forms/SettingsForm";

// Renamed from "System" to "Timezone" (the tab label — this page's content
// was already entirely timezone/date-format/fiscal-year settings, nothing
// else). The underlying settings group is still "system" — other code
// (e.g. the dashboard's fiscal_year_start_month lookup) already reads
// getSettingsByGroup(session, "system") and needs no change.
export default async function TimezoneSettingsPage() {
  const session = await getSession();
  const values = await getSettingsByGroup(session, "system");
  values.fiscal_year_start_month = values.fiscal_year_start_month || "4";
  return (<div><h1 className="text-xl font-semibold text-foreground mb-1 whitespace-nowrap">Timezone</h1><SettingsTabs /><SettingsForm group="system" initialValues={values} fields={[
    { key: "timezone", label: "Timezone", type: "timezone-search", hint: "Applied to every date/time shown across the workspace, including follow-up scheduling." },
    { key: "time_format", label: "Time Format", type: "select", options: [{ value: "12h", label: "12-hour (1:48 PM)" }, { value: "24h", label: "24-hour (13:48)" }] },
    { key: "date_format", label: "Date Format" },
    {
      key: "fiscal_year_start_month", label: "Financial Year Starts In", type: "select",
      hint: "Determines FY-2026 boundaries and the dashboard's Financial Year / Quarter filters. Defaults to April if unset.",
      options: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        .map((name, i) => ({ value: String(i + 1), label: name })),
    },
  ]} /></div>);
}
