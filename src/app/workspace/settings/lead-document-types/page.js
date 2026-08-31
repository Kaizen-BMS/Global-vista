import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadDocumentTypes } from "@/lib/modules/crm/actions/leadDocumentTypes";
import { hasLeadDocumentTypesSchema } from "@/lib/db/schemaFlags";
import ForbiddenState from "@/components/shared/ForbiddenState";
import SettingsTabs from "@/components/shared/SettingsTabs";
import LeadDocumentTypeManager from "@/components/settings/LeadDocumentTypeManager";

export default async function LeadDocumentTypesSettingsPage() {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return <ForbiddenState />;
  const schemaReady = await hasLeadDocumentTypesSchema();
  const types = schemaReady ? await listLeadDocumentTypes(session) : [];
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1 whitespace-nowrap">Lead Document Types</h1>
      <SettingsTabs />
      <LeadDocumentTypeManager initialTypes={types} schemaReady={schemaReady} />
    </div>
  );
}
