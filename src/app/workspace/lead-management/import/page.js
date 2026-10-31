import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { assertImportExportAllowed } from "@/lib/platform/tenant";
import { getCrmTerms } from "@/lib/helpers/crmTerms";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ImportWizard from "@/components/crm/leads/ImportWizard";
import ImportHistoryPanel from "@/components/crm/leads/ImportHistoryPanel";

export default async function LeadImportPage() {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return <ForbiddenState />;
  try { await assertImportExportAllowed(session.company_id); }
  catch (err) { return <ForbiddenState message={err.message} />; }
  const terms = getCrmTerms(session.is_child_company);

  const [sources, services] = await Promise.all([listLeadSources(session), listServices(session)]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Import {terms.plural}</h1>
      <p className="text-muted-foreground text-sm mb-6">Bring in {terms.pluralLower} from Excel or CSV — map your columns, review before committing, and undo nothing you didn't mean to.</p>
      <ImportWizard sources={sources} services={services} isChildCompany={session.is_child_company} />
      <ImportHistoryPanel />
    </div>
  );
}
