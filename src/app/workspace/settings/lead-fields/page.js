import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getFullLeadFormLayout, ensureDefaultSections } from "@/lib/modules/crm/actions/leadFieldLayout";
import { hasLeadFormBuilderSchema } from "@/lib/db/schemaFlags";
import ForbiddenState from "@/components/shared/ForbiddenState";
import SettingsTabs from "@/components/shared/SettingsTabs";
import LeadFormBuilder from "@/components/settings/leadFormBuilder/LeadFormBuilder";

export default async function LeadFieldsSettingsPage() {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return <ForbiddenState />;

  const schemaReady = await hasLeadFormBuilderSchema();
  if (schemaReady) await ensureDefaultSections(session, session.id);
  const groups = schemaReady ? await getFullLeadFormLayout(session) : [];

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
      <SettingsTabs />
      <LeadFormBuilder initialGroups={groups} schemaReady={schemaReady} />
    </div>
  );
}
