import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadCustomFields } from "@/lib/modules/crm/actions/leadCustomFields";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import ForbiddenState from "@/components/shared/ForbiddenState";
import SettingsTabs from "@/components/shared/SettingsTabs";
import LeadFieldBuilder from "@/components/settings/LeadFieldBuilder";

export default async function LeadFieldsSettingsPage() {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return <ForbiddenState />;
  const schemaReady = await hasLeadCustomFieldsSchema();
  const fields = schemaReady ? await listLeadCustomFields(session) : [];
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
      <SettingsTabs />
      <LeadFieldBuilder initialFields={fields} schemaReady={schemaReady} />
    </div>
  );
}
