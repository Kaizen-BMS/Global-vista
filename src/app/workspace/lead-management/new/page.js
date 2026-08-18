import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import { listDistinctTags } from "@/lib/modules/crm/actions/leads";
import { listLeadCustomFields } from "@/lib/modules/crm/actions/leadCustomFields";
import { getFullLeadFormLayout } from "@/lib/modules/crm/actions/leadFieldLayout";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import LeadForm from "@/components/modules/crm/forms/LeadForm";
import ForbiddenState from "@/components/shared/ForbiddenState";

export default async function NewLeadPage() {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return <ForbiddenState />;

  const schemaReady = await hasLeadCustomFieldsSchema();
  const [sources, services, counsellorsResult, tags, customFields, groups] = await Promise.all([
    listLeadSources(session), listServices(session), listUsers(session, { status: "active", pageSize: 100 }), listDistinctTags(session),
    schemaReady ? listLeadCustomFields(session, { activeOnly: true, context: "lead_form" }) : [],
    getFullLeadFormLayout(session, { context: "lead_form" }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Add Lead</h1>
      <p className="text-muted-foreground text-sm mb-6">Fill in as much detail as you have — you can complete the rest later.</p>
      <LeadForm sources={sources} services={services} counsellors={counsellorsResult.users} tagSuggestions={tags} customFields={customFields} groups={groups} />
    </div>
  );
}
