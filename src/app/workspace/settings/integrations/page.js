import { getSession } from "@/lib/auth";
import { canViewAllRecords } from "@/lib/modules/crm/rls";
import { listSyncSources } from "@/lib/actions/leadSync";
import { isGoogleSheetsConfigured } from "@/lib/integrations/googleSheets";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/shared/SettingsTabs";
import ForbiddenState from "@/components/shared/ForbiddenState";
import IntegrationsPanel from "@/components/settings/IntegrationsPanel";

export default async function IntegrationsSettingsPage() {
  const session = await getSession();
  if (!canViewAllRecords(session)) return <ForbiddenState />;

  const [sources, leadSources, services, usersResult, systemSettings] = await Promise.all([
    listSyncSources(session), listLeadSources(session), listServices(session),
    listUsers(session, { status: "active", pageSize: 100 }), getSettingsByGroup(session, "system"),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
      <SettingsTabs />
      <IntegrationsPanel
        sources={sources}
        leadSources={leadSources}
        services={services}
        users={usersResult.users}
        timezone={systemSettings.timezone || "UTC"}
        googleConfigured={isGoogleSheetsConfigured()}
      />
    </div>
  );
}
