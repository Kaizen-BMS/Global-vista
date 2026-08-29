import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { assertImportExportAllowed } from "@/lib/platform/tenant";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ImportWizard from "@/components/crm/leads/ImportWizard";
import ImportHistoryPanel from "@/components/crm/leads/ImportHistoryPanel";

export default async function LeadImportPage() {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return <ForbiddenState />;
  try { await assertImportExportAllowed(session.company_id); }
  catch (err) { return <ForbiddenState message={err.message} />; }

  const [sources, services] = await Promise.all([listLeadSources(session), listServices(session)]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Import Leads</h1>
      <p className="text-muted-foreground text-sm mb-6">Bring in leads from Excel or CSV — map your columns, review before committing, and undo nothing you didn't mean to.</p>
      <ImportWizard sources={sources} services={services} />
      <ImportHistoryPanel />
    </div>
  );
}
