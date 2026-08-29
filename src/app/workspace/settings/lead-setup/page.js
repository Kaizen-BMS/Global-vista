import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listCountries } from "@/lib/actions/geography";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { getFullLeadFormLayout, ensureDefaultSections } from "@/lib/modules/crm/actions/leadFieldLayout";
import { hasLeadFormBuilderSchema } from "@/lib/db/schemaFlags";
import SettingsTabs from "@/components/shared/SettingsTabs";
import GeographyEditor from "@/components/forms/GeographyEditor";
import ManagedListEditor from "@/components/forms/ManagedListEditor";
import LeadFormBuilder from "@/components/settings/leadFormBuilder/LeadFormBuilder";

// Geography + Lead Sources + Lead Fields combined — everything that
// shapes how a lead gets captured and categorized, in one place instead
// of three separate tabs.
export default async function LeadSetupPage() {
  const session = await getSession();
  const canManageFields = await can(session, "settings.manage");

  const schemaReady = await hasLeadFormBuilderSchema();
  if (schemaReady && canManageFields) await ensureDefaultSections(session, session.id);

  const [countries, leadSources, services, fieldGroups] = await Promise.all([
    listCountries(),
    listLeadSources(session),
    listServices(session),
    schemaReady && canManageFields ? getFullLeadFormLayout(session) : [],
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
      <SettingsTabs />

      <div className="space-y-8">
        <section>
          <h2 className="text-foreground font-medium mb-3">Geography</h2>
          <GeographyEditor countries={countries} />
        </section>

        <section>
          <h2 className="text-foreground font-medium mb-3">Lead Sources</h2>
          <ManagedListEditor title="Lead Sources" apiBase="/api/core/organization/lead-sources" items={leadSources} />
        </section>

        <section>
          <h2 className="text-foreground font-medium mb-3">Services</h2>
          <ManagedListEditor title="Services" apiBase="/api/core/organization/services" items={services} />
        </section>

        <section>
          <h2 className="text-foreground font-medium mb-3">Lead Fields</h2>
          {canManageFields ? (
            <LeadFormBuilder initialGroups={fieldGroups} schemaReady={schemaReady} />
          ) : (
            <p className="text-muted-foreground text-sm bg-card border border-border rounded-xl p-4">You don't have permission to manage lead fields.</p>
          )}
        </section>
      </div>
    </div>
  );
}
